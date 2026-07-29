import { deleteProject, updateProject } from "@/lib/projects";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/auth";
import {
  getRequestId,
  logError,
  recordSecurityEvent,
} from "@/lib/observability";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import { isValidProjectId, validateProjectInput } from "@/lib/validation";

type ProjectContext = { params: Promise<{ projectId: string }> };

function serverError(error: unknown, requestId?: string) {
  logError("project_request_failed", error, {
    route: "/api/projects/[projectId]",
    requestId,
  });

  if (error instanceof SupabaseConfigurationError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  return Response.json(
    { error: "Não foi possível alterar o projeto." },
    { status: 500 },
  );
}

async function readProjectId(context: ProjectContext) {
  const { projectId } = await context.params;
  return isValidProjectId(projectId) ? projectId : null;
}

export async function PATCH(request: Request, context: ProjectContext) {
  const requestId = getRequestId(request.headers);
  try {
    const projectId = await readProjectId(context);
    if (!projectId) {
      return Response.json({ error: "ID de projeto inválido." }, { status: 400 });
    }
    const access = await requireProjectAccess(projectId, ["owner", "admin", "editor"]);
    if (!access.ok) return unauthorizedResponse(access.status);
    const user = access.user;

    const result = validateProjectInput(await request.json());
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    const project = await updateProject(projectId, result.data);
    if (!project) {
      return Response.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }

    await recordSecurityEvent({
      headers: request.headers,
      eventType: "project.updated",
      outcome: "success",
      actorUserId: user.id,
      resourceType: "project",
      resourceId: project.id,
      requestId,
    });
    return Response.json({ project });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }
    return serverError(error, requestId);
  }
}

export async function DELETE(request: Request, context: ProjectContext) {
  const requestId = getRequestId(request.headers);
  try {
    const projectId = await readProjectId(context);
    if (!projectId) {
      return Response.json({ error: "ID de projeto inválido." }, { status: 400 });
    }
    const access = await requireProjectAccess(projectId, ["owner", "admin"]);
    if (!access.ok) return unauthorizedResponse(access.status);

    const deleted = await deleteProject(projectId);
    if (!deleted) {
      return Response.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }

    await recordSecurityEvent({
      headers: request.headers,
      eventType: "project.deleted",
      outcome: "success",
      actorUserId: access.user.id,
      resourceType: "project",
      resourceId: projectId,
      requestId,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error, requestId);
  }
}
