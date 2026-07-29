import { getPublicSnippetConfig, getSnippet } from "@/lib/snippets";
import { getRequestId, logError } from "@/lib/observability";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import { isValidSnippetId } from "@/lib/validation";
import { corsHeaders, originAllowed } from "@/lib/widget-security";

export const dynamic = "force-dynamic";

type WidgetContext = { params: Promise<{ snippetId: string }> };

export async function OPTIONS(request: Request, context: WidgetContext) {
  const { snippetId } = await context.params;
  const snippet = isValidSnippetId(snippetId) ? await getSnippet(snippetId) : null;
  const origin = request.headers.get("origin");
  const allowed = !!snippet && snippet.is_active && originAllowed(snippet, origin);
  return new Response(null, { status: allowed ? 204 : 403, headers: corsHeaders(origin, allowed, "GET, OPTIONS") });
}

export async function GET(request: Request, context: WidgetContext) {
  const requestId = getRequestId(request.headers);
  try {
    const { snippetId } = await context.params;
    if (!isValidSnippetId(snippetId)) {
      return Response.json(
        { error: "Snippet inválido." },
        { status: 400, headers: corsHeaders(request.headers.get("origin"), false, "GET, OPTIONS") },
      );
    }

    const [config, snippet] = await Promise.all([getPublicSnippetConfig(snippetId), getSnippet(snippetId)]);
    if (!config || !snippet) {
      return Response.json(
        { error: "Snippet não encontrado." },
        { status: 404, headers: corsHeaders(request.headers.get("origin"), false, "GET, OPTIONS") },
      );
    }
    const origin = request.headers.get("origin");
    const allowed = snippet.is_active && originAllowed(snippet, origin);
    if (!allowed) {
      return Response.json({ error: "Snippet indisponível." }, { status: 403, headers: corsHeaders(origin, allowed, "GET, OPTIONS") });
    }

    return Response.json(
      { config },
      { headers: corsHeaders(origin, allowed, "GET, OPTIONS") },
    );
  } catch (error) {
    logError("widget_config_failed", error, {
      route: "/api/widget/[snippetId]",
      requestId,
    });
    const message =
      error instanceof SupabaseConfigurationError
        ? error.message
        : "Não foi possível carregar o snippet.";
    return Response.json(
      { error: message },
      { status: error instanceof SupabaseConfigurationError ? 503 : 500, headers: corsHeaders(request.headers.get("origin"), false, "GET, OPTIONS") },
    );
  }
}
