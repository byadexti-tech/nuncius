import { deleteProject, updateProject } from "@/lib/projects";
import { requireAdminResponse } from "@/lib/auth";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import { isValidProjectId, validateProjectInput } from "@/lib/validation";

type ProjectContext = { params: Promise<{ projectId: string }> };

function serverError(error: unknown) {
  console.error("[project]", error);

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
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const projectId = await readProjectId(context);
    if (!projectId) {
      return Response.json({ error: "ID de projeto inválido." }, { status: 400 });
    }

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

    return Response.json({ project });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }
    return serverError(error);
  }
}

export async function DELETE(_request: Request, context: ProjectContext) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const projectId = await readProjectId(context);
    if (!projectId) {
      return Response.json({ error: "ID de projeto inválido." }, { status: 400 });
    }

    const deleted = await deleteProject(projectId);
    if (!deleted) {
      return Response.json(
        { error: "Projeto não encontrado." },
        { status: 404 },
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
