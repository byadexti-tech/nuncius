import { createProject, listProjects } from "@/lib/projects";
import { requireAdminResponse } from "@/lib/auth";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import { validateProjectInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

function serverError(error: unknown) {
  console.error("[projects]", error);

  if (error instanceof SupabaseConfigurationError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  return Response.json(
    { error: "Não foi possível acessar os projetos." },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    return Response.json({ projects: await listProjects() });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const result = validateProjectInput(await request.json());

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    const project = await createProject(result.data);
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }
    return serverError(error);
  }
}
