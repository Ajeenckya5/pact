"use client";

import { haversineKm } from "@/lib/data";
import { usePact } from "@/lib/store";
import type { Place, PlaceKind } from "@/lib/types";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 14, { duration: 0.6 });
  }, [lat, lng, map]);
  return null;
}

export default function MapCanvas({
  filter,
  selectedId,
  onSelect,
  places,
  here,
  flyTo,
  youLabel,
  track,
}: {
  filter: "all" | PlaceKind;
  selectedId?: string;
  onSelect: (place: Place) => void;
  places: Place[];
  here: { lat: number; lng: number };
  flyTo?: { lat: number; lng: number };
  youLabel?: string;
  track?: Array<{ lat: number; lng: number }>;
}) {
  const { storeId } = usePact();
  const shown = places.filter((p) => (filter === "all" ? true : p.kind === filter));
  const target = flyTo ?? here;
  const line = (track ?? []).map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className="h-full min-h-[420px]">
    <MapContainer
      center={[here.lat, here.lng]}
      zoom={13}
      className="h-full w-full rounded-3xl"
      style={{ height: "100%", minHeight: 420 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FlyTo lat={target.lat} lng={target.lng} />
      {line.length > 1 ? <Polyline positions={line} pathOptions={{ color: "#d6ff3f", weight: 4, opacity: 0.9 }} /> : null}
      <CircleMarker
        center={[here.lat, here.lng]}
        radius={12}
        pathOptions={{ color: "#f3efe6", fillColor: "#d6ff3f", fillOpacity: 1, weight: 2 }}
      >
        <Popup>{youLabel ?? "You"}</Popup>
      </CircleMarker>
      {shown.map((place) => {
        const active = place.id === selectedId || (place.kind === "grocery" && place.id === storeId);
        const color = place.kind === "gym" ? "#7c9cff" : "#d6ff3f";
        const km = haversineKm(here, place);
        return (
          <CircleMarker
            key={place.id}
            center={[place.lat, place.lng]}
            radius={active ? 14 : 10}
            pathOptions={{ color: "#f3efe6", fillColor: color, fillOpacity: 1, weight: active ? 3 : 1.5 }}
            eventHandlers={{ click: () => onSelect(place) }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{place.name}</strong>
                <div>
                  {place.area} · {km.toFixed(1)} km
                </div>
                <div>{place.hours}</div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
    </div>
  );
}
