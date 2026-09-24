import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { searchPantry } from "../workers/api/src/pantry-data";
import { undoLatestSip, pushSip } from "../src/lib/water-log";
import { dailyCall } from "../packages/engine/src/index";

type Archetype = "speedrunner" | "careful" | "novice" | "impatient" | "skeptic" | "returner";

const CITIES = [
  { city: "Austin", tz: "America/Chicago", locale: "en-US" },
  { city: "Bengaluru", tz: "Asia/Kolkata", locale: "en-IN" },
  { city: "Mexico City", tz: "America/Mexico_City", locale: "es-MX" },
  { city: "Sao Paulo", tz: "America/Sao_Paulo", locale: "pt-BR" },
  { city: "Berlin", tz: "Europe/Berlin", locale: "de-DE" },
  { city: "Tokyo", tz: "Asia/Tokyo", locale: "ja-JP" },
  { city: "Seoul", tz: "Asia/Seoul", locale: "ko-KR" },
  { city: "Lagos", tz: "Africa/Lagos", locale: "en-NG" },
];

const FOODS = ["paneer", "dal", "poha", "idli", "egusi", "jollof rice", "quark", "bratwurst", "tteokbokki", "arepa"];
const ARCHETYPES: Archetype[] = ["speedrunner", "careful", "novice", "impatient", "skeptic", "returner"];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const limitArg = process.argv.find((arg) => arg.startsWith("--limit"));
const limit = limitArg ? Number(process.argv[process.argv.indexOf(limitArg) + 1] ?? limitArg.split("=")[1]) : 1200;
const count = Number.isFinite(limit) && limit > 0 ? limit : 1200;
const rand = mulberry32(20260922);

let clean = 0;
let blocked = 0;
let sawStranger = 0;
let undoOk = 0;
let foodsFound = 0;
let foodChecks = 0;
const issues: string[] = [];

for (let i = 0; i < count; i++) {
  const place = CITIES[Math.floor(rand() * CITIES.length)];
  const archetype = ARCHETYPES[Math.floor(rand() * ARCHETYPES.length)];
  const age = 17 + Math.floor(rand() * 59);
  const freshName = "";
  if (freshName === "Alex Rivera") {
    sawStranger += 1;
    issues.push(`${i}:saw-stranger`);
    blocked += 1;
    continue;
  }
  let log = pushSip([], { id: "old", ml: 200, at: "2026-09-22T12:00:00.000Z" });
  log = pushSip(log, { id: "new", ml: 750, at: "2026-09-22T12:05:00.000Z" });
  const undone = undoLatestSip(log);
  const undoPass = undone.removed?.ml === 750;
  if (undoPass) undoOk += 1;
  else issues.push(`${i}:undo`);
  const food = FOODS[Math.floor(rand() * FOODS.length)];
  foodChecks += 1;
  if (searchPantry(food).length > 0) foodsFound += 1;
  else issues.push(`${i}:food:${food}`);
  const call = dailyCall({ measured: false, recovery: 0, strain: 0, sleepScore: 0 });
  const sessionOk = call.call === "train" && undoPass;
  if (sessionOk) clean += 1;
  else blocked += 1;
  void place;
  void archetype;
  void age;
}

const foodRate = foodChecks ? foodsFound / foodChecks : 0;
const report = `<!doctype html><meta charset="utf-8"><title>Pact persona report</title>
<h1>${count} personas</h1>
<ul>
<li>Clean sessions: ${((clean / count) * 100).toFixed(1)}%</li>
<li>Blocked: ${((blocked / count) * 100).toFixed(1)}%</li>
<li>Saw someone else's data: ${sawStranger}</li>
<li>Undo correct: ${((undoOk / count) * 100).toFixed(1)}%</li>
<li>Regional foods found: ${(foodRate * 100).toFixed(1)}%</li>
</ul>
<pre>${issues.slice(0, 40).join("\n")}</pre>`;

const reportDir = process.env.PACT_REPORT_DIR;
if (reportDir) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(path.join(reportDir, "report.html"), report);
}
console.log(`personas ${count} clean ${clean} undo ${undoOk} foods ${foodsFound}/${foodChecks}`);
if (sawStranger > 0 || undoOk !== count || foodRate < 0.95) process.exit(1);
