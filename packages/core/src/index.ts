export { dailyCall, recoveryAgeReady, HEALTH_TO_ENGINE } from "../../engine/src/index";
export { localDateKey, pactDateKey, previousDateKey, streakEnding } from "./streak";
export {
  createDeviceKeys,
  inviteFragment,
  inviteProof,
  openSeal,
  parseInviteFragment,
  publicKeyHex,
  randomSecret,
  sealTo,
  type DeviceKeys,
  type Sealed,
} from "./crypto";
export { forward } from "./net";
export { createBoxKey, createEpochKey, createSigningKey, openEnvelope, openEpochKey, pactHeaders, sealEnvelope, sealEpochKey, signBytes } from "./seal";
export {
  DEFAULT_FLAGS,
  ENVELOPE_FIELDS,
  NUDGE_CAP,
  applyFlag,
  assertEnvelope,
  countEvent,
  foreignFields,
  localEpoch,
  localHour,
  normalizeFlags,
  nudgeDecision,
  readableHealth,
  retentionDays,
  retained,
  socketCanon,
  shouldSendReceipt,
  verifyRequest,
  type EnvelopeKind,
  type Flags,
  type PactEnvelope,
} from "./wire";
export { NOTIFICATIONS, QUIET_HOURS } from "./notifications";
export { PERMISSIONS } from "./permissions";
export { foodFromOffPayload, portionOf, type OffFood } from "./food";
export { parseHeartRate } from "./ble";

export type EntityBase = {
  id: string;
  createdAt: string;
  deviceId: string;
};
