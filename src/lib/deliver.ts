import { sealEnvelope, type EnvelopeKind } from "@pact/core";
import { deviceIdentity } from "@/lib/identity";
import { enqueueOut, flushOutbox } from "@/lib/outbox";

export async function queueEnvelope(pactId: string, secret: string, kind: EnvelopeKind, payload: unknown) {
  const keys = await deviceIdentity();
  const now = Date.now();
  const offsetMin = -new Date(now).getTimezoneOffset();
  const envelope = await sealEnvelope({
    inviteSecret: secret,
    pactId,
    senderPk: keys.pk,
    senderSk: keys.sk,
    kind,
    payload,
    now,
    offsetMin,
  });
  enqueueOut(envelope);
  return flushOutbox();
}
