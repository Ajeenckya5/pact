/** Heart Rate Measurement, GATT 0x2A37. */

export function parseHeartRate(data: Uint8Array) {
  if (data.length < 2) throw new Error("Heart rate sample is too short");
  const flags = data[0];
  const wide = (flags & 0x01) !== 0;
  const bpm = wide ? data[1] | (data[2] << 8) : data[1];
  let offset = wide ? 3 : 2;
  if (flags & 0x08) offset += 2;
  const rrMs: number[] = [];
  if (flags & 0x10) {
    while (offset + 1 < data.length) {
      const raw = data[offset] | (data[offset + 1] << 8);
      rrMs.push(Math.round((raw / 1024) * 1000));
      offset += 2;
    }
  }
  return { bpm, rrMs };
}
