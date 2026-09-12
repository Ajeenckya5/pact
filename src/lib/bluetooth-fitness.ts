const SERVICES = [
  "heart_rate",
  "battery_service",
  "cycling_speed_and_cadence",
  "cycling_power",
  "running_speed_and_cadence",
  "fitness_machine",
  "health_thermometer",
  "pulse_oximeter",
  "weight_scale",
  "body_composition",
  "device_information",
] as const;

export const BRAND_PREFIXES: Record<string, string[]> = {
  polar: ["Polar", "H10", "H9", "OH1", "Verity", "Ignite", "Vantage", "Pacer", "Grit X"],
  garmin: ["Garmin", "HRM", "fenix", "Forerunner", "Venu", "Epix", "Instinct", "Edge"],
  whoop: ["WHOOP", "Whoop"],
  oura: ["Oura", "OURA"],
  fitbit: ["Fitbit", "Charge", "Versa", "Sense", "Inspire", "Pixel Watch"],
  "apple-watch": ["Apple Watch", "Watch"],
  samsung: ["Galaxy Watch", "Samsung"],
  coros: ["COROS", "Coros", "PACE", "VERTIX", "APEX"],
  suunto: ["Suunto"],
  amazfit: ["Amazfit", "Zepp", "GTR", "GTS"],
  withings: ["Withings", "ScanWatch", "Steel HR"],
  ultrahuman: ["Ultrahuman"],
  xiaomi: ["Mi Smart", "Xiaomi", "Mi Band", "Smart Band"],
  huawei: ["HUAWEI", "Huawei", "WATCH GT"],
  "health-connect": [],
  healthkit: [],
  "strava-source": [],
};

export type BleSample = {
  at: number;
  hr?: number;
  hrv?: number;
  cadence?: number;
  power?: number;
  speedKmh?: number;
  spo2?: number;
  tempC?: number;
  battery?: number;
};

export type BleLink = {
  id: string;
  name: string;
  wearableId: string | null;
  profiles: string[];
  sample: BleSample;
  connected: boolean;
};

type Listener = (links: BleLink[]) => void;

type GattServer = {
  connected: boolean;
  device: { id: string; name?: string | null };
  connect?: () => Promise<GattServer>;
  getPrimaryServices: () => Promise<GattService[]>;
  getPrimaryService: (uuid: string) => Promise<GattService>;
};

type GattService = {
  uuid: string;
  getCharacteristics: () => Promise<GattChar[]>;
  getCharacteristic: (uuid: string) => Promise<GattChar>;
};

type GattChar = {
  uuid: string;
  properties: { notify?: boolean; indicate?: boolean; read?: boolean };
  startNotifications: () => Promise<GattChar>;
  readValue: () => Promise<DataView>;
  addEventListener: (type: "characteristicvaluechanged", fn: (ev: Event) => void) => void;
};

type BtDevice = {
  id: string;
  name?: string | null;
  gatt?: {
    connected: boolean;
    connect: () => Promise<GattServer>;
    disconnect: () => void;
  };
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener?: (type: string, fn: () => void) => void;
};

type BtNav = {
  bluetooth?: {
    getAvailability?: () => Promise<boolean>;
    getDevices?: () => Promise<BtDevice[]>;
    requestDevice: (opts: Record<string, unknown>) => Promise<BtDevice>;
  };
};

type Internal = {
  device: BtDevice;
  wearableId: string | null;
  profiles: Set<string>;
  sample: BleSample;
  rr: number[];
  lastCrank?: { revs: number; time: number };
  onDisconnected: () => void;
};

function bt(): BtNav["bluetooth"] {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as unknown as BtNav).bluetooth;
}

export function bluetoothSupported() {
  return Boolean(bt()?.requestDevice);
}

export async function bluetoothAvailable() {
  const api = bt();
  if (!api?.requestDevice) return false;
  if (!api.getAvailability) return true;
  try {
    return await api.getAvailability();
  } catch {
    return true;
  }
}

export function matchWearableId(name: string) {
  const n = name.toLowerCase();
  for (const [id, prefixes] of Object.entries(BRAND_PREFIXES)) {
    if (prefixes.some((p) => n.includes(p.toLowerCase()))) return id;
  }
  return null;
}

function shortId(uuid: string) {
  const m = uuid.toLowerCase().match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/);
  return m ? m[1] : uuid.toLowerCase();
}

function rmssd(rr: number[]) {
  if (rr.length < 3) return undefined;
  let s = 0;
  for (let i = 1; i < rr.length; i++) {
    const d = rr[i] - rr[i - 1];
    s += d * d;
  }
  return Math.round(Math.sqrt(s / (rr.length - 1)));
}

function parseHr(view: DataView, rr: number[]) {
  const flags = view.getUint8(0);
  let offset = 1;
  const hr = flags & 0x1 ? view.getUint16(offset, true) : view.getUint8(offset);
  offset += flags & 0x1 ? 2 : 1;
  if (flags & 0x8) offset += 2;
  if (flags & 0x10) {
    while (offset + 1 < view.byteLength) {
      rr.push((view.getUint16(offset, true) / 1024) * 1000);
      offset += 2;
    }
    if (rr.length > 12) rr.splice(0, rr.length - 12);
  }
  return { hr, hrv: rmssd(rr) };
}

function parseCsc(view: DataView, last?: { revs: number; time: number }) {
  const flags = view.getUint8(0);
  let offset = 1;
  if (flags & 0x1) offset += 6;
  if (!(flags & 0x2) || offset + 3 >= view.byteLength) return { cadence: undefined as number | undefined, last };
  const revs = view.getUint16(offset, true);
  const time = view.getUint16(offset + 2, true);
  if (!last || time === last.time) return { cadence: undefined, last: { revs, time } };
  const dRevs = (revs - last.revs + 65536) % 65536;
  const dTime = ((time - last.time + 65536) % 65536) / 1024;
  const cadence = dTime > 0 ? Math.round((dRevs / dTime) * 60) : undefined;
  return { cadence, last: { revs, time } };
}

function parseRsc(view: DataView) {
  const speed = view.getUint16(1, true) / 256;
  const cadence = view.getUint8(3);
  return { speedKmh: Math.round(speed * 3.6 * 10) / 10, cadence };
}

function parsePower(view: DataView) {
  return view.getInt16(2, true);
}

function parseBike(view: DataView) {
  const flags = view.getUint16(0, true);
  let offset = 2;
  let speedKmh: number | undefined;
  let cadence: number | undefined;
  let power: number | undefined;
  let hr: number | undefined;
  if (!(flags & 0x1)) {
    speedKmh = Math.round((view.getUint16(offset, true) / 100) * 10) / 10;
    offset += 2;
  }
  if (flags & 0x2) offset += 2;
  if (flags & 0x4) {
    cadence = Math.round(view.getUint16(offset, true) / 2);
    offset += 2;
  }
  if (flags & 0x8) offset += 2;
  if (flags & 0x10) offset += 3;
  if (flags & 0x20) {
    power = view.getInt16(offset, true);
    offset += 2;
  }
  if (flags & 0x40) offset += 2;
  if (flags & 0x80) offset += 2;
  if (flags & 0x100) offset += 5;
  if (flags & 0x200) {
    hr = view.getUint8(offset);
  }
  return { speedKmh, cadence, power, hr };
}

function parseTemp(view: DataView) {
  if (view.byteLength >= 3) return view.getInt16(1, true) / 100;
  return view.getUint8(0) / 10;
}

function isCancel(err: unknown) {
  const name = typeof err === "object" && err && "name" in err ? String((err as { name: string }).name) : "";
  const msg = err instanceof Error ? err.message : "";
  return name === "NotFoundError" || /cancel/i.test(msg);
}

class FitnessRadio {
  private links = new Map<string, Internal>();
  private listeners = new Set<Listener>();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  snapshot(): BleLink[] {
    return [...this.links.values()].map((row) => ({
      id: row.device.id,
      name: row.device.name || "Bluetooth device",
      wearableId: row.wearableId,
      profiles: [...row.profiles],
      sample: { ...row.sample },
      connected: Boolean(row.device.gatt?.connected),
    }));
  }

  private emit() {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }

  private attach(device: BtDevice) {
    const existing = this.links.get(device.id);
    if (existing) return existing;
    const onDisconnected = () => {
      const row = this.links.get(device.id);
      if (row) row.sample = { ...row.sample, at: Date.now() };
      this.emit();
    };
    const row: Internal = {
      device,
      wearableId: matchWearableId(device.name || ""),
      profiles: new Set(),
      sample: { at: Date.now() },
      rr: [],
      onDisconnected,
    };
    device.addEventListener("gattserverdisconnected", onDisconnected);
    this.links.set(device.id, row);
    return row;
  }

  private async bindServer(row: Internal, server: GattServer) {
    let services: GattService[] = [];
    try {
      services = await server.getPrimaryServices();
    } catch {
      for (const name of SERVICES) {
        try {
          services.push(await server.getPrimaryService(name));
        } catch {
          /* device doesn't expose it */
        }
      }
    }
    for (const service of services) {
      const sid = shortId(service.uuid);
      let chars: GattChar[] = [];
      try {
        chars = await service.getCharacteristics();
      } catch {
        continue;
      }
      for (const ch of chars) {
        const cid = shortId(ch.uuid);
        const apply = (view: DataView) => {
          try {
            const next = { ...row.sample, at: Date.now() };
          if (cid === "2a37") {
            const parsed = parseHr(view, row.rr);
            next.hr = parsed.hr;
            if (parsed.hrv) next.hrv = parsed.hrv;
            row.profiles.add("heart rate");
          } else if (cid === "2a19") {
            next.battery = view.getUint8(0);
            row.profiles.add("battery");
          } else if (cid === "2a5b") {
            const parsed = parseCsc(view, row.lastCrank);
            row.lastCrank = parsed.last;
            if (parsed.cadence != null) next.cadence = parsed.cadence;
            row.profiles.add("cadence");
          } else if (cid === "2a53") {
            const parsed = parseRsc(view);
            next.speedKmh = parsed.speedKmh;
            next.cadence = parsed.cadence;
            row.profiles.add("run");
          } else if (cid === "2a63") {
            next.power = parsePower(view);
            row.profiles.add("power");
          } else if (cid === "2ad2") {
            const parsed = parseBike(view);
            if (parsed.hr != null) next.hr = parsed.hr;
            if (parsed.cadence != null) next.cadence = parsed.cadence;
            if (parsed.power != null) next.power = parsed.power;
            if (parsed.speedKmh != null) next.speedKmh = parsed.speedKmh;
            row.profiles.add("bike");
          } else if (cid === "2a1c" || cid === "2a6e") {
            next.tempC = Math.round(parseTemp(view) * 10) / 10;
            row.profiles.add("temp");
          } else if (cid === "2a5f" || cid === "2a5e") {
            next.spo2 = view.getUint16(1, true) / 100;
            row.profiles.add("spo2");
          } else if (sid === "180d") {
            row.profiles.add("heart rate");
          }
          row.sample = next;
          if (!row.wearableId) row.wearableId = matchWearableId(row.device.name || "");
          this.emit();
          } catch {
            /* short payload */
          }
        };
        const onValue = (ev: Event) => {
          const target = ev.target as unknown as { value?: DataView };
          if (target.value) apply(target.value);
        };
        try {
          if (ch.properties.notify || ch.properties.indicate) {
            ch.addEventListener("characteristicvaluechanged", onValue);
            await ch.startNotifications();
          } else if (ch.properties.read) {
            apply(await ch.readValue());
          }
        } catch {
          /* characteristic rejected */
        }
      }
    }
    this.emit();
  }

  async pair(opts?: { wearableId?: string }) {
    const api = bt();
    if (!api) throw new Error("Web Bluetooth isn't in this browser. Use Chrome or Edge on desktop or Android.");
    const prefixes = opts?.wearableId ? BRAND_PREFIXES[opts.wearableId] ?? [] : [];
    const optionalServices = [...SERVICES];
    const filters = prefixes.map((namePrefix) => ({ namePrefix }));
    const request = async (anyDevice: boolean) =>
      api.requestDevice(
        anyDevice || filters.length === 0
          ? { acceptAllDevices: true, optionalServices }
          : { filters, optionalServices },
      );
    let device: BtDevice;
    try {
      device = await request(filters.length === 0);
    } catch (err) {
      const cancelled = isCancel(err);
      if (cancelled && filters.length > 0) {
        try {
          device = await request(true);
        } catch (err2) {
          if (isCancel(err2)) throw new Error("cancelled");
          throw err2 instanceof Error ? err2 : new Error("Could not open the Bluetooth picker");
        }
      } else if (cancelled) {
        throw new Error("cancelled");
      } else {
        throw err instanceof Error ? err : new Error("Could not open the Bluetooth picker");
      }
    }
    const row = this.attach(device);
    if (opts?.wearableId) row.wearableId = opts.wearableId;
    const server = await device.gatt?.connect();
    if (!server) throw new Error("The device did not expose GATT. Some watches only talk to their own app.");
    await this.bindServer(row, server);
    return this.snapshot().find((l) => l.id === device.id)!;
  }

  async restore() {
    const api = bt();
    if (!api?.getDevices) return;
    const devices = await api.getDevices();
    for (const device of devices) {
      try {
        const row = this.attach(device);
        const server = device.gatt?.connected ? (device.gatt as unknown as GattServer) : await device.gatt?.connect();
        if (server) await this.bindServer(row, server);
      } catch {
        /* permission still needed */
      }
    }
  }

  disconnect(id: string) {
    const row = this.links.get(id);
    try {
      row?.device.gatt?.disconnect();
    } catch {
      /* already gone */
    }
    this.links.delete(id);
    this.emit();
  }

  disconnectAll() {
    for (const id of [...this.links.keys()]) this.disconnect(id);
  }
}

export const fitnessRadio = new FitnessRadio();

export function blePrimary(links: BleLink[]) {
  const live = links.filter((l) => l.connected);
  const withHr = live.find((l) => l.sample.hr != null);
  return withHr ?? live[0] ?? null;
}
