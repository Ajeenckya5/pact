import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export type GeoFix = {
  lat: number;
  lng: number;
  accuracy?: number;
  speedMps?: number | null;
};

function webGet(precise: boolean): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is off in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speedMps: pos.coords.speed,
        }),
      () => reject(new Error("Location permission denied")),
      {
        enableHighAccuracy: precise,
        maximumAge: precise ? 15_000 : 300_000,
        timeout: 12_000,
      },
    );
  });
}

export async function requestLocationAccess() {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const perm = await Geolocation.requestPermissions();
    return perm.location === "granted" || perm.coarseLocation === "granted";
  } catch {
    return false;
  }
}

export async function readFix(precise: boolean): Promise<GeoFix> {
  if (Capacitor.isNativePlatform()) {
    await requestLocationAccess();
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: precise,
      timeout: 12_000,
      maximumAge: precise ? 15_000 : 300_000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speedMps: pos.coords.speed ?? null,
    };
  }
  return webGet(precise);
}

export function watchFix(
  precise: boolean,
  onFix: (fix: GeoFix) => void,
  onErr?: () => void,
): () => void {
  if (Capacitor.isNativePlatform()) {
    let id = "";
    void (async () => {
      await requestLocationAccess();
      id = await Geolocation.watchPosition({ enableHighAccuracy: precise, timeout: 12_000 }, (pos, err) => {
        if (err || !pos) {
          onErr?.();
          return;
        }
        onFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speedMps: pos.coords.speed ?? null,
        });
      });
    })();
    return () => {
      if (id) void Geolocation.clearWatch({ id });
    };
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onErr?.();
    return () => {};
  }
  const watchId = navigator.geolocation.watchPosition(
    (pos) =>
      onFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speedMps: pos.coords.speed,
      }),
    () => onErr?.(),
    { enableHighAccuracy: precise, maximumAge: 5_000, timeout: 12_000 },
  );
  return () => navigator.geolocation.clearWatch(watchId);
}
