import { createProject, listProjects } from "@/lib/projects";
import {
  requireOrganizationAccess,
  resolveOrganizationId,
  unauthorizedResponse,
  getAuthenticatedUser,
} from "@/lib/auth";
import {
  getRequestId,
  logError,
  recordSecurityEvent,
} from "@/lib/observability";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import { validateProjectInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

function serverError(error: unknown, requestId?: string) {
  logError("projects_request_failed", error, {
    route: "/api/projects",
    requestId,
  });

  if (error instanceof SupabaseConfigurationError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  return Response.json(
    { error: "Não foi possível acessar os projetos." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse(401);
    const organizationId = await resolveOrganizationId(request, user.id);
    if (!organizationId) return Response.json({ projects: [] });
    const access = await requireOrganizationAccess(organizationId);
    if (!access.ok) return unauthorizedResponse(access.status);

    return Response.json({ projects: await listProjects(organizationId) });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  try {
    const user = await getAuthenticatedUser();
    if (!user) return unauthorizedResponse(401);
    const organizationId = await resolveOrganizationId(request, user.id);
    if (!organizationId) return unauthorizedResponse(403);
    const access = await requireOrganizationAccess(organizationId, ["owner", "admin", "editor"]);
    if (!access.ok) return unauthorizedResponse(access.status);

    const result = validateProjectInput(await request.json());

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    const project = await createProject(organizationId, result.data);
    await recordSecurityEvent({
      headers: request.headers,
      eventType: "project.created",
      outcome: "success",
      actorUserId: user.id,
      resourceType: "project",
      resourceId: project.id,
      requestId,
    });
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }
    return serverError(error, requestId);
  }
}
