import { getProject } from "@/lib/projects";
import { SupabaseConfigurationError } from "@/lib/supabase/server";
import { isValidProjectId } from "@/lib/validation";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...init?.headers },
  });
}

function extractReply(payload: unknown): string | null {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (!payload || typeof payload !== "object") return null;

  const value = payload as Record<string, unknown>;
  for (const key of ["reply", "response", "message", "output", "text"]) {
    if (typeof value[key] === "string" && value[key].trim()) {
      return value[key].trim();
    }
  }

  if (Array.isArray(payload) && payload.length > 0) {
    return extractReply(payload[0]);
  }

  return null;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "JSON inválido." }, { status: 400 });
  }

  try {
    const projectId =
      typeof body.projectId === "string" ? body.projectId.trim() : "";
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!isValidProjectId(projectId)) {
      return json({ error: "Projeto inválido." }, { status: 400 });
    }
    if (!sessionId || sessionId.length > 120) {
      return json({ error: "Sessão inválida." }, { status: 400 });
    }
    if (!message || message.length > 4000) {
      return json(
        { error: "A mensagem deve ter entre 1 e 4.000 caracteres." },
        { status: 400 },
      );
    }

    const project = await getProject(projectId);
    if (!project) {
      return json({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const webhookResponse = await fetch(project.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, sessionId, message }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

    const contentType = webhookResponse.headers.get("content-type") ?? "";
    let payload: unknown;
    if (contentType.includes("application/json")) {
      const rawPayload = await webhookResponse.text();
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        console.error("[chat] webhook returned invalid JSON");
        return json(
          { error: "O webhook retornou um JSON inválido." },
          { status: 502 },
        );
      }
    } else {
      payload = await webhookResponse.text();
    }

    if (!webhookResponse.ok) {
      console.error("[chat] webhook error", webhookResponse.status, payload);
      return json(
        { error: "O assistente não conseguiu responder agora." },
        { status: 502 },
      );
    }

    const reply = extractReply(payload);
    if (!reply) {
      return json(
        { error: "O webhook retornou uma resposta vazia ou incompatível." },
        { status: 502 },
      );
    }

    return json({ reply });
  } catch (error) {
    console.error("[chat]", error);

    if (error instanceof SupabaseConfigurationError) {
      return json({ error: error.message }, { status: 503 });
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return json(
        { error: "O webhook demorou mais de 30 segundos para responder." },
        { status: 504 },
      );
    }

    return json({ error: "Não foi possível acessar o webhook." }, { status: 502 });
  }
}
