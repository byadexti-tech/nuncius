import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser, requireOrganizationMembership, unauthorizedResponse } from "@/lib/auth";
import { recordSecurityEvent } from "@/lib/observability";

type Context = { params: Promise<{ organizationId: string }> };

async function requireAgency(organizationId: string, roles: ("owner" | "admin" | "editor" | "viewer" | "billing")[] = ["owner", "admin"]) {
  const access = await requireOrganizationMembership(organizationId, roles);
  if (!access.ok) return access;
  const { data, error } = await getSupabaseAdmin().from("organizations").select("type").eq("id", organizationId).single();
  if (error) throw error;
  if (data.type !== "agency") return { ok: false as const, status: 403 as const };
  return access;
}

export async function GET(_request: Request, context: Context) {
  const { organizationId } = await context.params;
  const access = await requireAgency(organizationId, ["owner", "admin", "editor", "viewer"]);
  if (!access.ok) return unauthorizedResponse(access.status);
  const { data, error } = await getSupabaseAdmin().from("agency_client_access").select("client_organization_id,role,status,created_at,revoked_at,organizations:client_organization_id(id,name,type)").eq("agency_organization_id", organizationId).eq("status", "active").order("created_at");
  if (error) throw error;
  return Response.json({ clients: data ?? [] });
}

export async function POST(request: Request, context: Context) {
  const { organizationId } = await context.params;
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse(401);
  const access = await requireAgency(organizationId);
  if (!access.ok) return unauthorizedResponse(access.status);
  const body = (await request.json().catch(() => null)) as { clientOrganizationId?: string; role?: string } | null;
  if (!body?.clientOrganizationId || body.clientOrganizationId === organizationId || !["admin", "editor", "viewer"].includes(body.role ?? "")) return Response.json({ error: "Cliente ou papel delegado inválido." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("agency_client_access").insert({ agency_organization_id: organizationId, client_organization_id: body.clientOrganizationId, role: body.role, created_by: user.id }).select("agency_organization_id,client_organization_id,role,status,created_at,revoked_at").single();
  if (error) throw error;
  await recordSecurityEvent({ headers: request.headers, eventType: "agency.client_linked", outcome: "success", actorUserId: user.id, resourceType: "agency_access", resourceId: body.clientOrganizationId, metadata: { agencyOrganizationId: organizationId } });
  return Response.json({ client: data }, { status: 201 });
}

export async function DELETE(request: Request, context: Context) {
  const { organizationId } = await context.params;
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse(401);
  const access = await requireAgency(organizationId);
  if (!access.ok) return unauthorizedResponse(access.status);
  const clientOrganizationId = new URL(request.url).searchParams.get("clientOrganizationId");
  if (!clientOrganizationId) return Response.json({ error: "clientOrganizationId é obrigatório." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("agency_client_access").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("agency_organization_id", organizationId).eq("client_organization_id", clientOrganizationId).eq("status", "active").select("client_organization_id").maybeSingle();
  if (error) throw error;
  if (!data) return Response.json({ error: "Vínculo não encontrado." }, { status: 404 });
  await recordSecurityEvent({ headers: request.headers, eventType: "agency.client_revoked", outcome: "success", actorUserId: user.id, resourceType: "agency_access", resourceId: clientOrganizationId, metadata: { agencyOrganizationId: organizationId } });
  return new Response(null, { status: 204 });
}
