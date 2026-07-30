import { requireProjectAccess, unauthorizedResponse } from "@/lib/auth";
import { deleteSnippet, updateSnippet } from "@/lib/snippets";
import { getSnippet } from "@/lib/snippets";
import { getProject } from "@/lib/projects";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import {
  getRequestId,
  logError,
  recordSecurityEvent,
} from "@/lib/observability";
import {
  isValidSnippetId,
  validateSnippetInput,
} from "@/lib/validation";
import { SNIPPET_FONTS } from "@/lib/types";

type SnippetContext = { params: Promise<{ snippetId: string }> };

function serverError(error: unknown, requestId?: string) {
  logError("snippet_request_failed", error, {
    route: "/api/snippets/[snippetId]",
    requestId,
  });

  if (error instanceof SupabaseConfigurationError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  return Response.json(
    { error: "Não foi possível alterar o snippet." },
    { status: 500 },
  );
}

async function readSnippetId(context: SnippetContext) {
  const { snippetId } = await context.params;
  return isValidSnippetId(snippetId) ? snippetId : null;
}

export async function PATCH(request: Request, context: SnippetContext) {
  const requestId = getRequestId(request.headers);
  try {
    const snippetId = await readSnippetId(context);
    if (!snippetId) {
      return Response.json({ error: "ID de snippet inválido." }, { status: 400 });
    }
    const existing = await getSnippet(snippetId);
    if (!existing) return Response.json({ error: "Snippet não encontrado." }, { status: 404 });
    const access = await requireProjectAccess(existing.project_id, ["owner", "admin", "editor"]);
    if (!access.ok) return unauthorizedResponse(access.status);

    const result = validateSnippetInput(await request.json());
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    const project = await getProject(existing.project_id);
    if (result.data.hidePoweredBy && !project?.is_premium) {
      return Response.json(
        { error: "Ocultar a assinatura está disponível apenas para projetos Premium." },
        { status: 403 },
      );
    }
    if (
      !project?.is_premium &&
      !SNIPPET_FONTS.includes(
        result.data.fontFamily as (typeof SNIPPET_FONTS)[number],
      )
    ) {
      return Response.json(
        { error: "Fontes personalizadas estão disponíveis apenas para projetos Premium." },
        { status: 403 },
      );
    }

    const snippet = await updateSnippet(snippetId, result.data);
    if (!snippet) {
      return Response.json(
        { error: "Snippet não encontrado." },
        { status: 404 },
      );
    }

    await recordSecurityEvent({
      headers: request.headers,
      eventType: "snippet.updated",
      outcome: "success",
      actorUserId: access.user.id,
      resourceType: "snippet",
      resourceId: snippet.id,
      requestId,
    });
    if (existing.is_active !== snippet.is_active) {
      await recordSecurityEvent({ headers: request.headers, eventType: snippet.is_active ? "snippet.activated" : "snippet.deactivated", outcome: "success", actorUserId: access.user.id, resourceType: "snippet", resourceId: snippet.id, requestId });
    }
    if (existing.origin_policy !== snippet.origin_policy || JSON.stringify(existing.allowed_origins) !== JSON.stringify(snippet.allowed_origins)) {
      await recordSecurityEvent({ headers: request.headers, eventType: "snippet.origins_updated", outcome: "success", actorUserId: access.user.id, resourceType: "snippet", resourceId: snippet.id, requestId });
    }
    return Response.json({ snippet });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }
    return serverError(error, requestId);
  }
}

export async function DELETE(request: Request, context: SnippetContext) {
  const requestId = getRequestId(request.headers);
  try {
    const snippetId = await readSnippetId(context);
    if (!snippetId) {
      return Response.json({ error: "ID de snippet inválido." }, { status: 400 });
    }
    const existing = await getSnippet(snippetId);
    if (!existing) return Response.json({ error: "Snippet não encontrado." }, { status: 404 });
    const access = await requireProjectAccess(existing.project_id, ["owner", "admin"]);
    if (!access.ok) return unauthorizedResponse(access.status);

    const result = await deleteSnippet(snippetId);
    if (result === "not-found") {
      return Response.json(
        { error: "Snippet não encontrado." },
        { status: 404 },
      );
    }
    if (result === "last-snippet") {
      return Response.json(
        { error: "Cada empresa precisa manter pelo menos um snippet." },
        { status: 409 },
      );
    }

    await recordSecurityEvent({
      headers: request.headers,
      eventType: "snippet.deleted",
      outcome: "success",
      actorUserId: access.user.id,
      resourceType: "snippet",
      resourceId: snippetId,
      requestId,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error, requestId);
  }
}
