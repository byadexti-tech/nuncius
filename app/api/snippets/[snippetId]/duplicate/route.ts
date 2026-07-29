import { requireProjectAccess, unauthorizedResponse } from "@/lib/auth";
import { duplicateSnippet, getSnippet } from "@/lib/snippets";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import {
  getRequestId,
  logError,
  recordSecurityEvent,
} from "@/lib/observability";
import { isValidSnippetId } from "@/lib/validation";

type DuplicateContext = { params: Promise<{ snippetId: string }> };

export async function POST(request: Request, context: DuplicateContext) {
  const requestId = getRequestId(request.headers);
  try {
    const { snippetId } = await context.params;
    if (!isValidSnippetId(snippetId)) {
      return Response.json({ error: "ID de snippet inválido." }, { status: 400 });
    }
    const original = await getSnippet(snippetId);
    if (!original) return Response.json({ error: "Snippet não encontrado." }, { status: 404 });
    const access = await requireProjectAccess(original.project_id, ["owner", "admin", "editor"]);
    if (!access.ok) return unauthorizedResponse(access.status);

    const snippet = await duplicateSnippet(snippetId);
    if (!snippet) {
      return Response.json(
        { error: "Snippet não encontrado." },
        { status: 404 },
      );
    }

    await recordSecurityEvent({
      headers: request.headers,
      eventType: "snippet.duplicated",
      outcome: "success",
      actorUserId: access.user.id,
      resourceType: "snippet",
      resourceId: snippet.id,
      requestId,
      metadata: { sourceSnippetId: snippetId },
    });
    return Response.json({ snippet }, { status: 201 });
  } catch (error) {
    logError("duplicate_snippet_failed", error, {
      route: "/api/snippets/[snippetId]/duplicate",
      requestId,
    });
    if (error instanceof SupabaseConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return Response.json(
      { error: "Não foi possível duplicar o snippet." },
      { status: 500 },
    );
  }
}
