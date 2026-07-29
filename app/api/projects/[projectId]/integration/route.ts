import { getProject, updateProject } from "@/lib/projects";
import { requireProjectAccess, unauthorizedResponse } from "@/lib/auth";
import { getRequestId, recordSecurityEvent } from "@/lib/observability";
import { isValidProjectId, validateProjectInput } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string }> };

async function projectForRequest(context: Context) {
  const { projectId } = await context.params;
  if (!isValidProjectId(projectId)) return null;
  return getProject(projectId);
}

export async function PATCH(request: Request, context: Context) {
  const requestId = getRequestId(request.headers);
  const project = await projectForRequest(context);
  if (!project) return Response.json({ error: "Projeto não encontrado." }, { status: 404 });
  const access = await requireProjectAccess(project.id, ["owner", "admin", "editor"]);
  if (!access.ok) return unauthorizedResponse(access.status);
  const body = await request.json().catch(() => null);
  const validation = validateProjectInput({ name: project.name, webhookUrl: (body as { webhookUrl?: unknown } | null)?.webhookUrl });
  if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });
  const updated = await updateProject(project.id, validation.data);
  await recordSecurityEvent({ headers: request.headers, eventType: "project.webhook_updated", outcome: "success", actorUserId: access.user.id, resourceType: "project", resourceId: project.id, requestId });
  return Response.json({ project: updated });
}

export async function POST(request: Request, context: Context) {
  const requestId = getRequestId(request.headers);
  const project = await projectForRequest(context);
  if (!project) return Response.json({ error: "Projeto não encontrado." }, { status: 404 });
  const access = await requireProjectAccess(project.id, ["owner", "admin", "editor"]);
  if (!access.ok) return unauthorizedResponse(access.status);
  try {
    const response = await fetch(project.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Nuncius-Request-Id": requestId },
      body: JSON.stringify({ event: "connection_test", projectId: project.id }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    const raw = (await response.text()).slice(0, 500);
    const responsePreview = contentType.includes("application/json") ? (() => { try { return JSON.stringify(JSON.parse(raw)).slice(0, 500); } catch { return "JSON inválido"; } })() : raw.replace(/[\r\n]/g, " ");
    await recordSecurityEvent({ headers: request.headers, eventType: "project.webhook_tested", outcome: response.ok ? "success" : "failure", actorUserId: access.user.id, resourceType: "project", resourceId: project.id, requestId, metadata: { status: response.status } });
    return Response.json({ ok: response.ok, status: response.status, responsePreview });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "Tempo limite de 8 segundos excedido." : "Não foi possível conectar ao webhook.";
    await recordSecurityEvent({ headers: request.headers, eventType: "project.webhook_tested", outcome: "failure", actorUserId: access.user.id, resourceType: "project", resourceId: project.id, requestId });
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
