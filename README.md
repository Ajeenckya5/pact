# Pact

Accountability fitness app: recovery and strain without being locked to one wearable, AI calorie photos, sleep + reading, water, workout films, Strava, maps of gyms and grocers, goal-based grocery cart and recipes you can order, friends, chat, community, and privacy controls on every metric.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

State lives in the browser (`localStorage`). HealthKit, Health Connect, Strava OAuth, and grocery checkout still need vendor credentials in production. Everything below is **keyless and free**.

## Free APIs (wired in)

| Feed | Used for | App route |
| --- | --- | --- |
| [Open-Meteo](https://open-meteo.com) | Weather, UV, AQI, sunrise/sunset | `/api/weather` |
| [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) | Place search | `/api/geocode` |
| [OSM Overpass](https://overpass-api.de) | Live gyms and grocery stores | `/api/places` |
| [Open Food Facts](https://world.openfoodfacts.org) | Calorie / macro search | `/api/foods` |
| [TheMealDB](https://www.themealdb.com) | Recipes from ingredients | `/api/recipes` |
| [wger](https://wger.de/en/software/api) | Exercise directory | `/api/exercises` |
| CARTO / OSM tiles | Map rendering | Places page |

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

- **Overview** — Pact score plus live Open-Meteo training weather
- **Sleep** — stages, overnight vitals, wind-down reading, sun clock
- **Calories** — camera scan + Open Food Facts search
- **Water** — goal-scaled hydration
- **Workouts** — YouTube library + wger directory
- **Market** — goal cart + TheMealDB recipes + order
- **Places** — OSM Overpass + curated pins
- **Strava / Wearables** — iOS + Android sources + feed health
- **Friends, Chat, Community** — nudges, photos, comments
- **Privacy** — private / friends / circle / public per metric
