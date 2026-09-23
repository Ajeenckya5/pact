import sodium from "libsodium-wrappers";
import {
  bytesToB64Url,
  b64UrlToBytes,
  envelopeCanon,
  localEpoch,
  requestCanon,
  verifyEd25519,
  type EnvelopeKind,
  type PactEnvelope,
} from "./wire";

async function ready() {
  await sodium.ready;
  return sodium;
}

function messageKey(lib: typeof sodium, inviteSecret: string) {
  return lib.crypto_generichash(32, lib.from_string(inviteSecret), lib.from_string("pact-xchacha-v1"));
}

export async function createSigningKey() {
  const lib = await ready();
  const pair = lib.crypto_sign_keypair();
  return { pk: bytesToB64Url(pair.publicKey), sk: bytesToB64Url(pair.privateKey) };
}

export async function signBytes(secretKey: string, message: string) {
  const lib = await ready();
  const sig = lib.crypto_sign_detached(lib.from_string(message), b64UrlToBytes(secretKey));
  return bytesToB64Url(sig);
}

export async function pactHeaders(
  keys: { pk: string; sk: string },
  input: { method: string; path: string; body: string; now?: number; offsetMin?: number },
) {
  const now = input.now ?? Date.now();
  const ts = Math.floor(now / 1000);
  const offsetMin = input.offsetMin ?? -new Date(now).getTimezoneOffset();
  const sig = await signBytes(keys.sk, await requestCanon({ ts, method: input.method, path: input.path, offsetMin, body: input.body }));
  return {
    "X-Pact-Pk": keys.pk,
    "X-Pact-Ts": String(ts),
    "X-Pact-Sig": sig,
    "X-Pact-Offset": String(offsetMin),
  };
}

/** Health values stay inside ct. libsodium XChaCha20-Poly1305, signed with Ed25519. */
export async function sealEnvelope(input: {
  inviteSecret: string;
  pactId: string;
  senderPk: string;
  senderSk: string;
  kind: EnvelopeKind;
  payload: unknown;
  now?: number;
  offsetMin?: number;
}): Promise<PactEnvelope> {
  const lib = await ready();
  const now = input.now ?? Date.now();
  const offsetMin = input.offsetMin ?? -new Date(now).getTimezoneOffset();
  const epoch = localEpoch(now, offsetMin);
  const key = messageKey(lib, input.inviteSecret);
  const nonce = lib.randombytes_buf(lib.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ad = new TextEncoder().encode(`${input.pactId}.${epoch}.${input.senderPk}.${input.kind}`);
  const ct = lib.crypto_aead_xchacha20poly1305_ietf_encrypt(
    new TextEncoder().encode(JSON.stringify(input.payload)),
    ad,
    null,
    nonce,
    key,
  );
  const draft = {
    v: 1 as const,
    pactId: input.pactId,
    epoch,
    senderPk: input.senderPk,
    kind: input.kind,
    nonce: bytesToB64Url(nonce),
    ct: bytesToB64Url(ct),
  };
  const sig = await signBytes(input.senderSk, envelopeCanon(draft));
  return { ...draft, sig };
}

export async function openEnvelope(inviteSecret: string, envelope: PactEnvelope) {
  const signed = await verifyEd25519(envelope.senderPk, envelope.sig, envelopeCanon(envelope));
  if (!signed) throw new Error("rejected");
  const lib = await ready();
  const key = messageKey(lib, inviteSecret);
  const ad = new TextEncoder().encode(`${envelope.pactId}.${envelope.epoch}.${envelope.senderPk}.${envelope.kind}`);
  const clear = lib.crypto_aead_xchacha20poly1305_ietf_decrypt(null, b64UrlToBytes(envelope.ct), ad, b64UrlToBytes(envelope.nonce), key);
  return JSON.parse(new TextDecoder().decode(clear)) as unknown;
}
