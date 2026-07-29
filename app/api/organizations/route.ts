import { randomBytes, createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  getAuthenticatedUser,
  listMemberships,
  requireOrganizationMembership,
  unauthorizedResponse,
} from "@/lib/auth";
import { recordSecurityEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse(401);
  const memberships = await listMemberships(user.id);
  if (!memberships.length) return Response.json({ organizations: [] });

  const { data, error } = await getSupabaseAdmin()
    .from("organizations")
    .select("id,name,type,created_at,updated_at")
    .in("id", memberships.map((item) => item.organization_id))
    .order("created_at", { ascending: true });
  if (error) throw error;
  return Response.json({
    organizations: (data ?? []).map((organization) => ({
      ...organization,
      role: memberships.find((item) => item.organization_id === organization.id)?.role,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse(401);
  const body = (await request.json().catch(() => null)) as { name?: string; type?: string } | null;
  const name = body?.name?.trim();
  const type = body?.type;
  if (!name || !["individual", "company", "agency"].includes(type ?? "")) {
    return Response.json({ error: "Nome e tipo de organização são obrigatórios." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: organization, error } = await supabase
    .from("organizations")
    .insert({ name, type })
    .select("id,name,type,created_at,updated_at")
    .single();
  if (error) throw error;

  const { error: membershipError } = await supabase.from("organization_memberships").insert({
    organization_id: organization.id,
    user_id: user.id,
    role: "owner",
  });
  if (membershipError) throw membershipError;
  await recordSecurityEvent({
    headers: request.headers,
    eventType: "organization.created",
    outcome: "success",
    actorUserId: user.id,
    resourceType: "organization",
    resourceId: organization.id,
  });
  return Response.json({ organization: { ...organization, role: "owner" } }, { status: 201 });
}

export async function createInvitation(organizationId: string, request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return { response: unauthorizedResponse(401) };
  const access = await requireOrganizationMembership(organizationId, ["owner", "admin"]);
  if (!access.ok) return { response: unauthorizedResponse(access.status) };
  const body = (await request.json().catch(() => null)) as { email?: string; role?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const role = body?.role;
  if (!email || !email.includes("@") || !["admin", "editor", "viewer", "billing"].includes(role ?? "")) {
    return { response: Response.json({ error: "E-mail e papel de convite inválidos." }, { status: 400 }) };
  }
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await getSupabaseAdmin()
    .from("organization_invitations")
    .insert({ organization_id: organizationId, email, role, token_hash: tokenHash, expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), invited_by: user.id })
    .select("id,organization_id,email,role,status,expires_at,created_at")
    .single();
  if (error) throw error;
  await recordSecurityEvent({ headers: request.headers, eventType: "membership.invited", outcome: "success", actorUserId: user.id, resourceType: "invitation", resourceId: data.id });
  return { response: Response.json({ invitation: data, token }, { status: 201 }) };
}
