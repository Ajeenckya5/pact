import { NextResponse } from "next/server";

export function jsonOk(data: unknown, seconds = 300) {
  if (seconds <= 0) {
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json(data, {
    headers: { "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=600` },
  });
}

export function jsonErr(message: string, status = 502) {
  return NextResponse.json({ error: message }, { status });
}
