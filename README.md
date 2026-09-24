# Pact

Accountability fitness app: recovery and strain without being locked to one wearable, AI calorie photos, sleep + reading, water, workout films, Strava, maps of gyms and grocers, goal-based grocery cart and recipes you can order, friends, chat, community, and privacy controls on every metric.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## GitHub Pages vs Android APK

They are different builds of the same app.

| | GitHub Pages | Android APK |
| --- | --- | --- |
| URL | [ajeenckya5.github.io/pact](https://ajeenckya5.github.io/pact/) | [Releases → Pact-debug.apk](https://github.com/Ajeenckya5/pact/releases/tag/android-debug) |
| Bluetooth | Web Bluetooth in Chrome or Edge | Native BLE (Nearby devices permission) |
| Live track | GPS in the browser tab | GPS + BLE while the app is open |
| Install | Open the site | Sideload the APK (unknown sources) |

Pair a **GATT** strap or trainer (Polar H10, Garmin HRM, Wahoo TICKR, smart bike). Apple Watch, Oura, HealthKit, Health Connect, and many WHOOP units only talk to their own apps — Pact will not invent those numbers.

On the phone: Connect Bluetooth → allow Nearby devices and Location → open **Track** → Start live track. Samples are the real notifications from that one device.

Local APK (needs Android SDK):

```bash
npm run apk
```

The debug file lands at `android/app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions builds it on every push to `main`.

State lives in the browser (`localStorage`). HealthKit, Health Connect, Strava OAuth, and grocery checkout still need vendor credentials in production. Everything below is **keyless and free**.

## Free APIs (wired in)

| Feed | Used for | App route |
| --- | --- | --- |
| [Open-Meteo](https://open-meteo.com) | Weather, UV, AQI, sunrise/sunset | `/api/weather` |
| [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | Place search | `/api/geocode` |
| [OSM Overpass](https://overpass-api.de) | Live gyms and grocery stores | `/api/places` |
| Worker D1 `foods` | Calorie / macro search | `/foods` |
| [TheMealDB](https://www.themealdb.com) | Recipes from ingredients | `/api/recipes` |
| [wger](https://wger.de/en/software/api) | Exercise directory | `/api/exercises` |
| [OpenStreetMap tiles](https://www.openstreetmap.org/copyright) | Map rendering (no key; OSM.de / Esri dark fallback) | Places page |

Status of those feeds is on **Wearables**.

## Pact MCP (Cursor)

Project MCP config: `.cursor/mcp.json`. It starts `mcp/server.mjs` with **no secrets**. Tools:

- `pact_weather`
- `pact_places`
- `pact_foods`
- `pact_recipes`
- `pact_exercises`
- `pact_geocode`

Enable **pact-free-apis** in Cursor Settings → MCP if it does not connect automatically, then reload the window.

## What’s inside

- **Overview** — Pact score, live weather, and an on-device color match
- **Sleep** — stages, overnight vitals, wind-down reading, sun clock
- **Calories** — Worker food search, a 200-food device cache, and an on-device color match
- **Water** — goal-scaled hydration
- **Workouts** — YouTube library + wger directory
- **Market** — goal cart + TheMealDB recipes
- **Places** — OSM Overpass gyms and grocery stores
- **Strava / Wearables** — iOS + Android sources + feed health
- **Friends, Chat, Community** — photos stay on the device, plus nudges and comments
- **Privacy** — private / friends / circle / public per metric
