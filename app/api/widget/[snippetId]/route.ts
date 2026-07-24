import { getPublicSnippetConfig } from "@/lib/snippets";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import { isValidSnippetId } from "@/lib/validation";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

type WidgetContext = { params: Promise<{ snippetId: string }> };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(_request: Request, context: WidgetContext) {
  try {
    const { snippetId } = await context.params;
    if (!isValidSnippetId(snippetId)) {
      return Response.json(
        { error: "Snippet inválido." },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const config = await getPublicSnippetConfig(snippetId);
    if (!config) {
      return Response.json(
        { error: "Snippet não encontrado." },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    return Response.json(
      { config },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[widget-config]", error);
    const message =
      error instanceof SupabaseConfigurationError
        ? error.message
        : "Não foi possível carregar o snippet.";
    return Response.json(
      { error: message },
      { status: error instanceof SupabaseConfigurationError ? 503 : 500, headers: CORS_HEADERS },
    );
  }
}
