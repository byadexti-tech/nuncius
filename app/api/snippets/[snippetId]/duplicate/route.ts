import { requireAdminResponse } from "@/lib/auth";
import { duplicateSnippet } from "@/lib/snippets";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import { isValidSnippetId } from "@/lib/validation";

type DuplicateContext = { params: Promise<{ snippetId: string }> };

export async function POST(_request: Request, context: DuplicateContext) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const { snippetId } = await context.params;
    if (!isValidSnippetId(snippetId)) {
      return Response.json({ error: "ID de snippet inválido." }, { status: 400 });
    }

    const snippet = await duplicateSnippet(snippetId);
    if (!snippet) {
      return Response.json(
        { error: "Snippet não encontrado." },
        { status: 404 },
      );
    }

    return Response.json({ snippet }, { status: 201 });
  } catch (error) {
    console.error("[duplicate-snippet]", error);
    if (error instanceof SupabaseConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return Response.json(
      { error: "Não foi possível duplicar o snippet." },
      { status: 500 },
    );
  }
}
