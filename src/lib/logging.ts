import "server-only";
export function logEvent(event: string, requestId: string, outcome: "ok" | "error") {
  // Deliberately accepts no arbitrary payload, credentials, URLs or exception objects.
  console.info(JSON.stringify({ event, requestId, outcome, timestamp: new Date().toISOString() }));
}
