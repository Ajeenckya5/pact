import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { openSealedBox, sealToBox, createBoxKey } from "@pact/core";
import { archiveHasRows, dropArchived, splitDeviceHistory, withoutPhotos, type HistorySlice } from "./device-history";
import type { MealLog } from "./types";

const NOW = Date.parse("2026-09-23T12:00:00Z");
const OLD = new Date(NOW - 31 * 86_400_000).toISOString();
const RECENT = new Date(NOW - 2 * 86_400_000).toISOString();

function meal(id: string, at: string): MealLog {
  return { id, foodId: id, name: id, kcal: 10, protein: 1, carbs: 1, fat: 1, at, source: "manual", photo: "data:image/png;base64,aaaa" };
}

function slice(): HistorySlice {
  return {
    meals: [meal("old-meal", OLD), meal("new-meal", RECENT)],
    waterLog: [{ id: "old-sip", ml: 200, at: OLD }],
    workoutLogs: [],
    messages: { thread: [{ id: "old-msg", threadId: "thread", from: "me", kind: "text", text: "earlier", at: OLD }] },
    coachMessages: [],
    history: [
      { date: "2026-01-01", recovery: 1, strain: 1, sleepMin: 1, sleepScore: 1, hrv: 1, rhr: 1, kcal: 1, water: 1, steps: 1 },
      { date: "2026-09-22", recovery: 1, strain: 1, sleepMin: 1, sleepScore: 1, hrv: 1, rhr: 1, kcal: 1, water: 1, steps: 1 },
    ],
  };
}

describe("device history", () => {
  test("keeps 30 days and separates the rest", () => {
    const split = splitDeviceHistory(slice(), NOW);
    assert.deepEqual(split.kept.meals.map((row) => row.id), ["new-meal"]);
    assert.deepEqual(split.older.meals.map((row) => row.id), ["old-meal"]);
    assert.equal(split.kept.waterLog.length, 0);
    assert.equal(split.older.messages.thread?.[0]?.text, "earlier");
    assert.deepEqual(split.older.history.map((day) => day.date), ["2026-01-01"]);
    assert.equal(archiveHasRows(split.older), true);
  });

  test("drops archived rows only after they are listed", () => {
    const current = slice();
    const older = splitDeviceHistory(current, NOW).older;
    const next = dropArchived(current, older);
    assert.deepEqual(next.meals.map((row) => row.id), ["new-meal"]);
    assert.equal(next.messages.thread, undefined);
    assert.deepEqual(next.history.map((day) => day.date), ["2026-09-22"]);
  });

  test("a personal backup is ciphertext the box key can open", async () => {
    const keys = await createBoxKey();
    const older = withoutPhotos(splitDeviceHistory(slice(), NOW).older);
    assert.equal("photo" in (older.meals[0] ?? {}), false);
    const ct = await sealToBox(older, keys.publicKey);
    assert.equal(ct.includes("old-meal"), false);
    const opened = await openSealedBox(ct, keys.publicKey, keys.secretKey);
    assert.equal((opened as HistorySlice).meals[0]?.id, "old-meal");
  });
});
