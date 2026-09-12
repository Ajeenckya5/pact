/** GATT aliases → 128-bit UUIDs for native BLE. */
export const GATT_SERVICES: Record<string, string> = {
  heart_rate: "0000180d-0000-1000-8000-00805f9b34fb",
  battery_service: "0000180f-0000-1000-8000-00805f9b34fb",
  cycling_speed_and_cadence: "00001816-0000-1000-8000-00805f9b34fb",
  cycling_power: "00001818-0000-1000-8000-00805f9b34fb",
  running_speed_and_cadence: "00001814-0000-1000-8000-00805f9b34fb",
  fitness_machine: "00001826-0000-1000-8000-00805f9b34fb",
  health_thermometer: "00001809-0000-1000-8000-00805f9b34fb",
  pulse_oximeter: "00001822-0000-1000-8000-00805f9b34fb",
  weight_scale: "0000181d-0000-1000-8000-00805f9b34fb",
  body_composition: "0000181b-0000-1000-8000-00805f9b34fb",
  device_information: "0000180a-0000-1000-8000-00805f9b34fb",
};

export const SERVICE_UUIDS = Object.values(GATT_SERVICES);

export function shortUuid(uuid: string) {
  const m = uuid.toLowerCase().match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/);
  return m ? m[1] : uuid.toLowerCase();
}
