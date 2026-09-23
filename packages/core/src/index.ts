export { dailyCall, recoveryAgeReady, HEALTH_TO_ENGINE } from "../../engine/src/index";
export { localDateKey, previousDateKey, streakEnding } from "./streak";
export {
  createDeviceKeys,
  inviteFragment,
  inviteProof,
  openMessage,
  openSeal,
  sealMessage,
  parseInviteFragment,
  publicKeyHex,
  randomSecret,
  sealTo,
  type DeviceKeys,
  type Sealed,
} from "./crypto";
export { NOTIFICATIONS, QUIET_HOURS } from "./notifications";
export { PERMISSIONS } from "./permissions";
export { foodFromOffPayload, portionOf, type OffFood } from "./food";
export { parseHeartRate } from "./ble";

export type EntityBase = {
  id: string;
  createdAt: string;
  deviceId: string;
};
