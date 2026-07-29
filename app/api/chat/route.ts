import { getProject } from "@/lib/projects";
import { getSnippet } from "@/lib/snippets";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import {
  consumeRateLimit,
  getRequestId,
  logError,
  logInfo,
  recordAnalyticsEvent,
  recordSecurityEvent,
} from "@/lib/observability";
import { isValidProjectId } from "@/lib/validation";
import { corsHeaders, originAllowed } from "@/lib/widget-security";

export const dynamic = "force-dynamic";

function json(
  data: unknown,
  requestId: string,
  init?: ResponseInit,
  origin?: string | null,
  allowed = false,
) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders(origin ?? null, allowed, "POST, OPTIONS"),
      "X-Request-Id": requestId,
      ...init?.headers,
    },
  });
}

function extractReply(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (!payload || typeof payload !== "object") return null;

  const value = payload as Record<string, unknown>;
  for (const key of ["reply", "response", "message", "output", "text"]) {
    if (typeof value[key] === "string" && value[key].trim()) {
      return value[key].trim();
    }
  }

  if (Array.isArray(payload) && payload.length > 0) {
    return extractReply(payload[0]);
  }

  return null;
}

export async function OPTIONS(request: Request) {
  const snippetId = new URL(request.url).searchParams.get("snippetId") ?? "";
  const snippet = isValidProjectId(snippetId) ? await getSnippet(snippetId) : null;
  const origin = request.headers.get("origin");
  const allowed = !!snippet && snippet.is_active && originAllowed(snippet, origin);
  return new Response(null, { status: allowed ? 204 : 403, headers: corsHeaders(origin, allowed, "POST, OPTIONS") });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request.headers);
  let analyticsContext: {
    event: "chat_opened" | "message";
    projectId: string;
    snippetId: string | null;
    sessionId: string;
  } | null = null;

  const rateLimit = await consumeRateLimit({
    headers: request.headers,
    scope: "chat",
    maxRequests: 60,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    await recordSecurityEvent({
      headers: request.headers,
      eventType: "security.rate_limited",
      outcome: "blocked",
      resourceType: "api",
      requestId,
      metadata: { scope: "chat" },
    });
    return json(
      { error: "Muitas solicitações. Tente novamente em instantes." },
      requestId,
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "JSON inválido." }, requestId, { status: 400 });
  }

  try {
    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";
    const snippetId = typeof body.snippetId === "string" ? body.snippetId.trim() : new URL(request.url).searchParams.get("snippetId")?.trim() ?? "";
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const event = body.event === "chat_opened" ? "chat_opened" : "message";
    const submittedMessage =
      typeof body.message === "string" ? body.message.trim() : "";

    if (
      (!snippetId || !isValidProjectId(snippetId)) &&
      (!projectId || !isValidProjectId(projectId))
    ) {
      return json({ error: "Snippet inválido." }, requestId, { status: 400 });
    }
    if (!sessionId || sessionId.length > 120) {
      return json({ error: "Sessão inválida." }, requestId, { status: 400 });
    }

    const snippet = snippetId ? await getSnippet(snippetId) : null;
    if (snippetId && !snippet) {
      return json(
        { error: "Snippet não encontrado." },
        requestId,
        { status: 404 },
      );
    }
    const origin = request.headers.get("origin");
    const allowed = snippet ? snippet.is_active && originAllowed(snippet, origin) : true;
    if (!allowed) {
      return json({ error: "Origem ou snippet não autorizado." }, requestId, { status: 403 }, origin, false);
    }

    const resolvedProjectId = snippet?.project_id ?? projectId;
    const project = await getProject(resolvedProjectId);
    if (!project) {
      return json(
        { error: "Projeto não encontrado." },
        requestId,
        { status: 404 },
      );
    }

    analyticsContext = {
      event,
      projectId: resolvedProjectId,
      snippetId: snippet?.id ?? null,
      sessionId,
    };

    if (event === "chat_opened") {
      await recordAnalyticsEvent({
        headers: request.headers,
        eventType: "chat_opened",
        outcome: snippet?.auto_start_enabled ? "success" : "skipped",
        projectId: resolvedProjectId,
        snippetId: snippet?.id ?? null,
        sessionId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        requestId,
      });
      if (!snippet?.auto_start_enabled) {
        return json({ skipped: true }, requestId, undefined, origin, allowed);
      }
    }

    const message =
      event === "chat_opened"
        ? snippet?.auto_start_message.trim() ?? ""
        : submittedMessage;
    if (!message || message.length > 4000) {
      return json(
        { error: "A mensagem deve ter entre 1 e 4.000 caracteres." },
        requestId,
        { status: 400 },
      );
    }

    if (event === "message") {
      await recordAnalyticsEvent({
        headers: request.headers,
        eventType: "message_requested",
        projectId: resolvedProjectId,
        snippetId: snippet?.id ?? null,
        sessionId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        requestId,
      });
    }

    logInfo("chat_webhook_started", {
      route: "/api/chat",
      requestId,
      projectId: resolvedProjectId,
      snippetId: snippet?.id ?? null,
      event,
    });

    const webhookResponse = await fetch(project.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Nuncius-Request-Id": requestId,
      },
      body: JSON.stringify({
        projectId: resolvedProjectId,
        snippetId: snippet?.id,
        sessionId,
        message,
        event,
        hidden: event === "chat_opened",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const contentType = webhookResponse.headers.get("content-type") ?? "";
    let payload: unknown;
    if (contentType.includes("application/json")) {
      const rawPayload = await webhookResponse.text();
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        logError(
          "chat_webhook_invalid_json",
          new Error("invalid_webhook_json"),
          {
            route: "/api/chat",
            requestId,
            projectId: resolvedProjectId,
            snippetId: snippet?.id ?? null,
            statusCode: webhookResponse.status,
            durationMs: Date.now() - startedAt,
          },
        );
        if (event === "message") {
          await recordAnalyticsEvent({
            headers: request.headers,
            eventType: "message_failed",
            outcome: "failure",
            projectId: resolvedProjectId,
            snippetId: snippet?.id ?? null,
            sessionId,
            statusCode: 502,
            durationMs: Date.now() - startedAt,
            requestId,
          });
        }
        return json(
          { error: "O webhook retornou um JSON inválido." },
          requestId,
          { status: 502 },
        );
      }
    } else {
      payload = await webhookResponse.text();
    }

    if (!webhookResponse.ok) {
      logError("chat_webhook_failed", new Error("webhook_non_success"), {
        route: "/api/chat",
        requestId,
        projectId: resolvedProjectId,
        snippetId: snippet?.id ?? null,
        statusCode: webhookResponse.status,
        durationMs: Date.now() - startedAt,
      });
      if (event === "message") {
        await recordAnalyticsEvent({
          headers: request.headers,
          eventType: "message_failed",
          outcome: "failure",
          projectId: resolvedProjectId,
          snippetId: snippet?.id ?? null,
          sessionId,
          statusCode: 502,
          durationMs: Date.now() - startedAt,
          requestId,
        });
      }
      return json(
        { error: "O assistente não conseguiu responder agora." },
        requestId,
        { status: 502 },
      );
    }

    const reply = extractReply(payload);
    if (!reply) {
      if (event === "message") {
        await recordAnalyticsEvent({
          headers: request.headers,
          eventType: "message_failed",
          outcome: "failure",
          projectId: resolvedProjectId,
          snippetId: snippet?.id ?? null,
          sessionId,
          statusCode: 502,
          durationMs: Date.now() - startedAt,
          requestId,
        });
      }
      return json(
        { error: "O webhook retornou uma resposta vazia ou incompatível." },
        requestId,
        { status: 502 },
      );
    }

    if (event === "message") {
      await recordAnalyticsEvent({
        headers: request.headers,
        eventType: "message_succeeded",
        projectId: resolvedProjectId,
        snippetId: snippet?.id ?? null,
        sessionId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        requestId,
      });
    }
    logInfo("chat_webhook_completed", {
      route: "/api/chat",
      requestId,
      projectId: resolvedProjectId,
      snippetId: snippet?.id ?? null,
      event,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return json({ reply }, requestId, undefined, origin, allowed);
  } catch (error) {
    const statusCode =
      error instanceof SupabaseConfigurationError
        ? 503
        : error instanceof Error && error.name === "TimeoutError"
          ? 504
          : 502;

    logError("chat_request_failed", error, {
      route: "/api/chat",
      requestId,
      projectId: analyticsContext?.projectId,
      snippetId: analyticsContext?.snippetId,
      event: analyticsContext?.event,
      statusCode,
      durationMs: Date.now() - startedAt,
    });

    if (analyticsContext?.event === "message") {
      await recordAnalyticsEvent({
        headers: request.headers,
        eventType: "message_failed",
        outcome: "failure",
        projectId: analyticsContext.projectId,
        snippetId: analyticsContext.snippetId,
        sessionId: analyticsContext.sessionId,
        statusCode,
        durationMs: Date.now() - startedAt,
        requestId,
      });
    }

    if (error instanceof SupabaseConfigurationError) {
      return json({ error: error.message }, requestId, { status: 503 });
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return json(
        { error: "O webhook demorou mais de 30 segundos para responder." },
        requestId,
        { status: 504 },
      );
    }

    return json(
      { error: "Não foi possível acessar o webhook." },
      requestId,
      { status: 502 },
    );
  }
}
