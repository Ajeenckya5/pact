#!/usr/bin/env node
/**
 * Pact MCP — free, keyless tools for weather, places, food, recipes, exercises.
 * Stdio only. Do not log to stdout.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const UA = "PactAccountability/1.0 (mcp; local)";

async function getJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(14000),
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function text(obj) {
  return { content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] };
}

const server = new McpServer({ name: "pact-free-apis", version: "1.0.0" });

server.registerTool(
  "pact_weather",
  {
    title: "Pact weather",
    description: "Current weather, UV, sunrise/sunset, and US AQI from Open-Meteo. No API key.",
    inputSchema: { lat: z.number(), lng: z.number() },
  },
  async ({ lat, lng }) => {
    const forecast = await getJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=uv_index_max,sunrise,sunset&timezone=auto`,
    );
    let air = null;
    try {
      air = await getJson(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5`,
      );
    } catch {
      air = null;
    }
    return text({ forecast, air });
  },
);

server.registerTool(
  "pact_places",
  {
    title: "Pact gyms and grocers",
    description: "Nearby gyms and grocery stores from OpenStreetMap Overpass. No API key.",
    inputSchema: {
      lat: z.number(),
      lng: z.number(),
      kind: z.enum(["all", "gym", "grocery"]).optional(),
    },
  },
  async ({ lat, lng, kind = "all" }) => {
    const gym = `nwr["leisure"="fitness_centre"](around:3500,${lat},${lng});nwr["leisure"="sports_centre"](around:3500,${lat},${lng});`;
    const grocery = `nwr["shop"="supermarket"](around:3500,${lat},${lng});nwr["shop"="grocery"](around:3500,${lat},${lng});nwr["shop"="organic"](around:3500,${lat},${lng});`;
    const inner = kind === "gym" ? gym : kind === "grocery" ? grocery : gym + grocery;
    const query = `[out:json][timeout:20];(${inner});out center 30;`;
    const data = await getJson("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }),
    });
    const places = (data.elements ?? [])
      .filter((el) => el.tags?.name)
      .map((el) => ({
        name: el.tags.name,
        lat: el.center?.lat ?? el.lat,
        lng: el.center?.lon ?? el.lon,
        hours: el.tags.opening_hours ?? null,
        shop: el.tags.shop ?? el.tags.leisure ?? null,
      }));
    return text({ count: places.length, places });
  },
);

server.registerTool(
  "pact_foods",
  {
    title: "Pact food search",
    description: "Search Open Food Facts for calories and macros. No API key.",
    inputSchema: { q: z.string().min(2) },
  },
  async ({ q }) => {
    const data = await getJson(
      `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=8`,
    );
    const foods = (data.hits ?? []).map((p) => ({
      name: p.product_name || p.product_name_en,
      kcal: p.nutriments?.["energy-kcal_100g"],
      protein: p.nutriments?.proteins_100g,
      carbs: p.nutriments?.carbohydrates_100g,
      fat: p.nutriments?.fat_100g,
    }));
    return text({ foods });
  },
);

server.registerTool(
  "pact_recipes",
  {
    title: "Pact recipes",
    description:
      "Pact plates are bundled in the app from the pantry. This tool does not call an outside recipe API.",
    inputSchema: {
      q: z.string().optional(),
      ingredient: z.string().optional(),
      letter: z.string().max(1).optional(),
    },
  },
  async ({ q, ingredient }) => {
    return text({
      source: "pact",
      q: q ?? "",
      ingredient: ingredient ?? "",
      note: "Open Recipes in Pact. Plates and macros come from the bundled pantry.",
    });
  },
);

server.registerTool(
  "pact_exercises",
  {
    title: "Pact exercises",
    description: "Exercise directory from wger (English). No API key.",
    inputSchema: { q: z.string().optional() },
  },
  async ({ q }) => {
    const data = await getJson("https://wger.de/api/v2/exerciseinfo/?limit=16&language=2");
    const needle = q?.toLowerCase();
    const exercises = (data.results ?? [])
      .map((ex) => {
        const tr = ex.translations?.find((t) => t.language === 2 && t.name) ?? ex.translations?.[0];
        return {
          name: tr?.name,
          category: ex.category?.name,
          equipment: (ex.equipment ?? []).map((e) => e.name),
        };
      })
      .filter((ex) => !needle || String(ex.name ?? "").toLowerCase().includes(needle));
    return text({ exercises });
  },
);

server.registerTool(
  "pact_geocode",
  {
    title: "Pact geocode",
    description: "Forward geocoding via Open-Meteo. No API key.",
    inputSchema: { q: z.string().min(2) },
  },
  async ({ q }) => {
    const data = await getJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`,
    );
    return text({ results: data.results ?? [] });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
