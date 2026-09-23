/** Same-origin /api in local Next. The public site calls the Worker directly. */
export function workerOrigin() {
  return (process.env.NEXT_PUBLIC_PACT_API ?? "").replace(/\/$/, "");
}

export function pactApi(path: string) {
  const origin = workerOrigin();
  return origin ? `${origin}${path}` : `/api${path}`;
}

/** Local Next rewrites /api/reports. The Worker path includes the pact id. */
export function reportApi(pactId: string) {
  const origin = workerOrigin();
  return origin ? `${origin}/pacts/${encodeURIComponent(pactId)}/reports` : "/api/reports";
}
