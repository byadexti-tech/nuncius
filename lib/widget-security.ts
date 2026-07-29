import type { Snippet } from "@/lib/types";

export function originAllowed(snippet: Pick<Snippet, "origin_policy" | "allowed_origins">, origin: string | null) {
  if (snippet.origin_policy === "allow_all") return true;
  return !!origin && snippet.allowed_origins.includes(origin);
}

export function corsHeaders(origin: string | null, allowed: boolean, methods: string) {
  return {
    ...(allowed && origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };
}
