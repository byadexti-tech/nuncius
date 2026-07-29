import { requireProjectAccess, unauthorizedResponse } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { createSnippet, listSnippets } from "@/lib/snippets";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import {
  getRequestId,
  logError,
  recordSecurityEvent,
} from "@/lib/observability";
import {
  isValidProjectId,
  validateSnippetInput,
} from "@/lib/validation";

type SnippetsContext = { params: Promise<{ projectId: string }> };

function serverError(error: unknown, requestId?: string) {
  logError("snippets_request_failed", error, {
    route: "/api/projects/[projectId]/snippets",
    requestId,
  });

  if (error instanceof SupabaseConfigurationError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  return Response.json(
    { error: "Não foi possível acessar os snippets." },
    { status: 500 },
  );
}

async function readProjectId(context: SnippetsContext) {
  const { projectId } = await context.params;
  return isValidProjectId(projectId) ? projectId : null;
}

export async function GET(_request: Request, context: SnippetsContext) {
  try {
    const projectId = await readProjectId(context);
    if (!projectId) {
      return Response.json({ error: "ID de projeto inválido." }, { status: 400 });
    }
    const access = await requireProjectAccess(projectId);
    if (!access.ok) return unauthorizedResponse(access.status);

    if (!(await getProject(projectId))) {
      return Response.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }

    return Response.json({ snippets: await listSnippets(projectId) });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request, context: SnippetsContext) {
  const requestId = getRequestId(request.headers);
  try {
    const projectId = await readProjectId(context);
    if (!projectId) {
      return Response.json({ error: "ID de projeto inválido." }, { status: 400 });
    }
    const access = await requireProjectAccess(projectId, ["owner", "admin", "editor"]);
    if (!access.ok) return unauthorizedResponse(access.status);

    if (!(await getProject(projectId))) {
      return Response.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }

    const result = validateSnippetInput(await request.json());
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    const snippet = await createSnippet(projectId, result.data);
    await recordSecurityEvent({
      headers: request.headers,
      eventType: "snippet.created",
      outcome: "success",
      actorUserId: access.user.id,
      resourceType: "snippet",
      resourceId: snippet.id,
      requestId,
      metadata: { projectId },
    });
    return Response.json({ snippet }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }
    return serverError(error, requestId);
  }
}
