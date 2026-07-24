import { requireAdminResponse } from "@/lib/auth";
import { deleteSnippet, updateSnippet } from "@/lib/snippets";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import {
  isValidSnippetId,
  validateSnippetInput,
} from "@/lib/validation";

type SnippetContext = { params: Promise<{ snippetId: string }> };

function serverError(error: unknown) {
  console.error("[snippet]", error);

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
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const snippetId = await readSnippetId(context);
    if (!snippetId) {
      return Response.json({ error: "ID de snippet inválido." }, { status: 400 });
    }

    const result = validateSnippetInput(await request.json());
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    const snippet = await updateSnippet(snippetId, result.data);
    if (!snippet) {
      return Response.json(
        { error: "Snippet não encontrado." },
        { status: 404 },
      );
    }

    return Response.json({ snippet });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }
    return serverError(error);
  }
}

export async function DELETE(_request: Request, context: SnippetContext) {
  try {
    const unauthorized = await requireAdminResponse();
    if (unauthorized) return unauthorized;

    const snippetId = await readSnippetId(context);
    if (!snippetId) {
      return Response.json({ error: "ID de snippet inválido." }, { status: 400 });
    }

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

    return new Response(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
