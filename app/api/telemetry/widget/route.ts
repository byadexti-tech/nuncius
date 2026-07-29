import {
  consumeRateLimit,
  getRequestId,
  logError,
  logInfo,
  recordAnalyticsEvent,
  recordSecurityEvent,
} from "@/lib/observability";
import { getSnippet } from "@/lib/snippets";
import { isValidSnippetId } from "@/lib/validation";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function response(status: number, requestId: string, retryAfter?: number) {
  return new Response(null, {
    status,
    headers: {
      ...CORS_HEADERS,
      "X-Request-Id": requestId,
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);

  const limit = await consumeRateLimit({
    headers: request.headers,
    scope: "widget_telemetry",
    maxRequests: 30,
    windowSeconds: 60,
  });
  if (!limit.allowed) {
    await recordSecurityEvent({
      headers: request.headers,
      eventType: "security.rate_limited",
      outcome: "blocked",
      resourceType: "api",
      requestId,
      metadata: { scope: "widget_telemetry" },
    });
    return response(429, requestId, limit.retryAfterSeconds);
  }

  try {
    if (Number(request.headers.get("content-length") ?? 0) > 2048) {
      return response(413, requestId);
    }

    const body = (await request.json()) as Record<string, unknown>;
    const snippetId =
      typeof body.snippetId === "string" ? body.snippetId.trim() : "";
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    if (
      !isValidSnippetId(snippetId) ||
      sessionId.length < 8 ||
      sessionId.length > 120
    ) {
      return response(400, requestId);
    }

    const snippet = await getSnippet(snippetId);
    if (!snippet) return response(404, requestId);

    await recordAnalyticsEvent({
      headers: request.headers,
      eventType: "widget_loaded",
      projectId: snippet.project_id,
      snippetId: snippet.id,
      sessionId,
      statusCode: 202,
      durationMs: Date.now() - startedAt,
      requestId,
    });
    logInfo("widget_telemetry_recorded", {
      route: "/api/telemetry/widget",
      requestId,
      snippetId,
      projectId: snippet.project_id,
      durationMs: Date.now() - startedAt,
    });
    return response(202, requestId);
  } catch (error) {
    logError("widget_telemetry_failed", error, {
      route: "/api/telemetry/widget",
      requestId,
      durationMs: Date.now() - startedAt,
    });
    return response(error instanceof SyntaxError ? 400 : 500, requestId);
  }
}
