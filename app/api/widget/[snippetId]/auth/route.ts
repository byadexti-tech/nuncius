import { getProject } from "@/lib/projects";
import { getSnippet } from "@/lib/snippets";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import {
  consumeRateLimit,
  getRequestId,
  logError,
  logInfo,
} from "@/lib/observability";
import { isValidSnippetId } from "@/lib/validation";
import { WEBHOOK_TIMEOUT_MS } from "@/lib/webhook";
import { corsHeaders, originAllowed } from "@/lib/widget-security";

export const dynamic = "force-dynamic";

type AuthContext = { params: Promise<{ snippetId: string }> };

function json(
  data: unknown,
  requestId: string,
  init: ResponseInit,
  origin: string | null,
  allowed: boolean,
) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders(origin, allowed, "POST, OPTIONS"),
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
      ...init.headers,
    },
  });
}

function responseObject(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) return responseObject(payload[0]);
  return payload && typeof payload === "object"
    ? (payload as Record<string, unknown>)
    : null;
}

export async function OPTIONS(request: Request, context: AuthContext) {
  const { snippetId } = await context.params;
  const snippet = isValidSnippetId(snippetId)
    ? await getSnippet(snippetId)
    : null;
  const origin = request.headers.get("origin");
  const allowed =
    !!snippet && snippet.is_active && originAllowed(snippet, origin);

  return new Response(null, {
    status: allowed ? 204 : 403,
    headers: corsHeaders(origin, allowed, "POST, OPTIONS"),
  });
}

export async function POST(request: Request, context: AuthContext) {
  const requestId = getRequestId(request.headers);
  const origin = request.headers.get("origin");
  let responseAllowed = false;

  try {
    const { snippetId } = await context.params;
    if (!isValidSnippetId(snippetId)) {
      return json(
        { error: "Snippet inválido." },
        requestId,
        { status: 400 },
        origin,
        false,
      );
    }

    const snippet = await getSnippet(snippetId);
    const allowed =
      !!snippet && snippet.is_active && originAllowed(snippet, origin);
    responseAllowed = allowed;
    if (!snippet || !allowed) {
      return json(
        { error: "Origem ou snippet não autorizado." },
        requestId,
        { status: 403 },
        origin,
        false,
      );
    }
    if (!snippet.auth_enabled) {
      return json(
        { error: "A autenticação não está habilitada neste snippet." },
        requestId,
        { status: 409 },
        origin,
        true,
      );
    }

    const rateLimit = await consumeRateLimit({
      headers: request.headers,
      scope: `widget_auth:${snippetId}`,
      maxRequests: 10,
      windowSeconds: 60,
    });
    if (!rateLimit.allowed) {
      return json(
        { error: "Muitas tentativas. Aguarde um instante e tente novamente." },
        requestId,
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
        origin,
        true,
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const method =
      body.method === "manual" || body.method === "automatic"
        ? body.method
        : null;
    if (!sessionId || sessionId.length > 120) {
      return json(
        { error: "Sessão inválida." },
        requestId,
        { status: 400 },
        origin,
        true,
      );
    }
    if (method !== snippet.auth_mode) {
      return json(
        { error: "Método de autenticação inválido." },
        requestId,
        { status: 400 },
        origin,
        true,
      );
    }

    let authentication: Record<string, string>;
    if (method === "manual") {
      const username =
        typeof body.username === "string" ? body.username.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (
        !username ||
        username.length > 254 ||
        !password ||
        password.length > 512
      ) {
        return json(
          { error: "Informe login e senha." },
          requestId,
          { status: 400 },
          origin,
          true,
        );
      }
      authentication = { method, username, password };
    } else {
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!token || token.length > 4096) {
        return json(
          { error: "Token automático não informado." },
          requestId,
          { status: 400 },
          origin,
          true,
        );
      }
      authentication = { method, token };
    }

    const project = await getProject(snippet.project_id);
    if (!project) {
      return json(
        { error: "Projeto não encontrado." },
        requestId,
        { status: 404 },
        origin,
        true,
      );
    }

    logInfo("widget_auth_webhook_started", {
      route: "/api/widget/[snippetId]/auth",
      requestId,
      projectId: project.id,
      snippetId,
      method,
    });

    const webhookResponse = await fetch(project.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Nuncius-Request-Id": requestId,
      },
      body: JSON.stringify({
        event: "authenticate",
        projectId: project.id,
        snippetId,
        sessionId,
        authentication,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    const payload = responseObject(
      await webhookResponse.json().catch(() => null),
    );
    if (!webhookResponse.ok) {
      const rejected =
        webhookResponse.status === 401 || webhookResponse.status === 403;
      return json(
        {
          error: rejected
            ? "Login ou credenciais inválidos."
            : "O n8n não conseguiu validar o acesso.",
        },
        requestId,
        {
          status:
            webhookResponse.status === 429
              ? 429
              : rejected
                ? 401
                : 502,
        },
        origin,
        true,
      );
    }
    if (payload?.authenticated !== true) {
      return json(
        { error: "Login ou credenciais inválidos." },
        requestId,
        { status: 401 },
        origin,
        true,
      );
    }

    const authToken =
      typeof payload.authToken === "string" ? payload.authToken.trim() : "";
    if (!authToken || authToken.length > 4096) {
      return json(
        { error: "O n8n não retornou um token de autenticação válido." },
        requestId,
        { status: 502 },
        origin,
        true,
      );
    }

    logInfo("widget_auth_webhook_completed", {
      route: "/api/widget/[snippetId]/auth",
      requestId,
      projectId: project.id,
      snippetId,
      method,
      statusCode: 200,
    });

    return json(
      { authenticated: true, authToken },
      requestId,
      { status: 200 },
      origin,
      true,
    );
  } catch (error) {
    logError("widget_auth_request_failed", error, {
      route: "/api/widget/[snippetId]/auth",
      requestId,
    });

    const status =
      error instanceof SupabaseConfigurationError
        ? 503
        : error instanceof SyntaxError
          ? 400
          : error instanceof Error && error.name === "TimeoutError"
            ? 504
            : 502;
    const message =
      status === 400
        ? "JSON inválido."
        : status === 504
          ? "O n8n demorou demais para validar o acesso."
          : error instanceof SupabaseConfigurationError
            ? error.message
            : "Não foi possível validar o acesso no n8n.";

    return json(
      { error: message },
      requestId,
      { status },
      origin,
      responseAllowed,
    );
  }
}
