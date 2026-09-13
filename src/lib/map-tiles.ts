/** Keyless raster basemaps. CARTO dark tiles now watermark “API key required”. */

export const OSM_RASTER = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

export const OSM_DE_RASTER = {
  url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

/** Esri Canvas Dark Gray — public tiles, no personal key. y/x are swapped vs OSM. */
export const ESRI_DARK = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  attribution: "Tiles &copy; Esri",
};

export const MAP_FEEDS = [
  { id: "osm", name: "OpenStreetMap tiles", use: "Map rendering (no key)", url: "https://tile.openstreetmap.org", key: false, probe: "https://tile.openstreetmap.org/0/0/0.png" },
  { id: "esri-dark", name: "Esri Dark Gray", use: "Dark basemap fallback", url: "https://server.arcgisonline.com", key: false, probe: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/0/0/0" },
] as const;
