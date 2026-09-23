/**
 * Pact seals. The invite secret stays in the URL fragment.
 * Wire bytes: 32-byte X25519 ephemeral public key, 12-byte IV, AES-GCM ciphertext.
 */

const SEAL_INFO = new TextEncoder().encode("pact-seal-v1");
const MESSAGE_INFO = new TextEncoder().encode("pact-message-v1");

export type DeviceKeys = {
  x25519: CryptoKeyPair;
  ed25519: CryptoKeyPair;
};

export type Sealed = {
  v: 1;
  recipient: string;
  box: string;
};

function bytesToB64(bytes: Uint8Array) {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

function b64ToBytes(value: string) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function createDeviceKeys(): Promise<DeviceKeys> {
  const [x25519, ed25519] = await Promise.all([
    crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]),
    crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]),
  ]);
  return { x25519: x25519 as CryptoKeyPair, ed25519: ed25519 as CryptoKeyPair };
}

export async function publicKeyHex(key: CryptoKey) {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  return [...raw].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sharedKey(privateKey: CryptoKey, publicKey: CryptoKey) {
  const bits = await crypto.subtle.deriveBits({ name: "X25519", public: publicKey }, privateKey, 256);
  return crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
}

async function aesFromShared(shared: CryptoKey) {
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: SEAL_INFO },
    shared,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function sealTo(recipientPublic: CryptoKey, plaintext: Uint8Array): Promise<Sealed> {
  const ephemeral = (await crypto.subtle.generateKey({ name: "X25519" }, true, ["deriveBits"])) as CryptoKeyPair;
  const shared = await sharedKey(ephemeral.privateKey, recipientPublic);
  const aes = await aesFromShared(shared);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, plaintext as BufferSource),
  );
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  const packed = new Uint8Array(pub.length + iv.length + cipher.length);
  packed.set(pub, 0);
  packed.set(iv, pub.length);
  packed.set(cipher, pub.length + iv.length);
  return { v: 1, recipient: await publicKeyHex(recipientPublic), box: bytesToB64(packed) };
}

export async function openSeal(recipientPrivate: CryptoKey, sealed: Sealed): Promise<Uint8Array> {
  const packed = b64ToBytes(sealed.box);
  const pub = packed.slice(0, 32);
  const iv = packed.slice(32, 44);
  const cipher = packed.slice(44);
  const ephemeralPublic = await crypto.subtle.importKey("raw", pub, { name: "X25519" }, true, []);
  const shared = await sharedKey(recipientPrivate, ephemeralPublic);
  const aes = await aesFromShared(shared);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aes, cipher);
  return new Uint8Array(clear);
}

export function inviteFragment(pactId: string, inviteSecret: string) {
  return `${pactId}.${inviteSecret}`;
}

export function parseInviteFragment(fragment: string) {
  const raw = fragment.replace(/^#/, "");
  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;
  return { pactId: raw.slice(0, dot), inviteSecret: raw.slice(dot + 1) };
}

export async function inviteProof(inviteSecret: string, pactId: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(inviteSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(pactId)));
  return bytesToB64(sig);
}

async function messageKey(inviteSecret: string) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(inviteSecret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info: MESSAGE_INFO },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Both people who hold the invite secret can read this. The server only sees the box. */
export async function sealMessage(inviteSecret: string, plaintext: string) {
  const aes = await messageKey(inviteSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, new TextEncoder().encode(plaintext) as BufferSource),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return bytesToB64(packed);
}

export async function openMessage(inviteSecret: string, box: string) {
  const aes = await messageKey(inviteSecret);
  const packed = b64ToBytes(box);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: packed.slice(0, 12) }, aes, packed.slice(12));
  return new TextDecoder().decode(clear);
}

export async function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToB64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
