import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createInvitation } from "@/app/api/organizations/route";
import { getAuthenticatedUser, requireOrganizationMembership, unauthorizedResponse } from "@/lib/auth";
import { recordSecurityEvent } from "@/lib/observability";

type Context = { params: Promise<{ organizationId: string }> };

export async function GET(_request: Request, context: Context) {
  const { organizationId } = await context.params;
  const access = await requireOrganizationMembership(organizationId);
  if (!access.ok) return unauthorizedResponse(access.status);
  const { data, error } = await getSupabaseAdmin().from("organization_memberships").select("organization_id,user_id,role,status,created_at,updated_at").eq("organization_id", organizationId).order("created_at");
  if (error) throw error;
  return Response.json({ members: data ?? [] });
}

export async function POST(request: Request, context: Context) {
  const { organizationId } = await context.params;
  const result = await createInvitation(organizationId, request);
  return result.response;
}

export async function PATCH(request: Request, context: Context) {
  const { organizationId } = await context.params;
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse(401);
  const access = await requireOrganizationMembership(organizationId, ["owner", "admin"]);
  if (!access.ok) return unauthorizedResponse(access.status);
  const body = (await request.json().catch(() => null)) as { userId?: string; role?: string } | null;
  if (!body?.userId || !["owner", "admin", "editor", "viewer", "billing"].includes(body.role ?? "")) return Response.json({ error: "Membro ou papel inválido." }, { status: 400 });
  if (body.role === "owner" && access.membership.role !== "owner") return unauthorizedResponse(403);
  const { data, error } = await getSupabaseAdmin().from("organization_memberships").update({ role: body.role, updated_at: new Date().toISOString() }).eq("organization_id", organizationId).eq("user_id", body.userId).select("organization_id,user_id,role,status,created_at,updated_at").maybeSingle();
  if (error) throw error;
  if (!data) return Response.json({ error: "Membro não encontrado." }, { status: 404 });
  await recordSecurityEvent({ headers: request.headers, eventType: "membership.updated", outcome: "success", actorUserId: user.id, resourceType: "membership", resourceId: organizationId });
  return Response.json({ member: data });
}

export async function DELETE(request: Request, context: Context) {
  const { organizationId } = await context.params;
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse(401);
  const access = await requireOrganizationMembership(organizationId, ["owner", "admin"]);
  if (!access.ok) return unauthorizedResponse(access.status);
  const userId = new URL(request.url).searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId é obrigatório." }, { status: 400 });
  if (userId === user.id && access.membership.role === "owner") return Response.json({ error: "Transfira a propriedade antes de sair." }, { status: 409 });
  const { data, error } = await getSupabaseAdmin().from("organization_memberships").delete().eq("organization_id", organizationId).eq("user_id", userId).select("user_id").maybeSingle();
  if (error) throw error;
  if (!data) return Response.json({ error: "Membro não encontrado." }, { status: 404 });
  await recordSecurityEvent({ headers: request.headers, eventType: "membership.removed", outcome: "success", actorUserId: user.id, resourceType: "membership", resourceId: organizationId });
  return new Response(null, { status: 204 });
}
