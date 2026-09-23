/** Local calendar streaks. Daylight-saving jumps still count as one day. */

export function localDateKey(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function previousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() - 1);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Count consecutive local days ending at `today`, including today when it is logged. */
export function streakEnding(loggedDays: string[], today: string) {
  const have = new Set(loggedDays);
  let cursor = have.has(today) ? today : previousDateKey(today);
  if (!have.has(cursor)) return 0;
  let count = 0;
  while (have.has(cursor)) {
    count += 1;
    cursor = previousDateKey(cursor);
  }
  return count;
}
