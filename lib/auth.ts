import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { OrganizationMembership, OrganizationRole } from "@/lib/types";

export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export const getAdminUser = getAuthenticatedUser;

const ROLE_ORDER: Record<OrganizationRole, number> = {
  viewer: 1,
  billing: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export async function listMemberships(userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("organization_memberships")
    .select("organization_id,user_id,role,status,created_at,updated_at")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
  return (data ?? []) as OrganizationMembership[];
}

export async function getDefaultOrganizationId(userId: string) {
  const memberships = await listMemberships(userId);
  return memberships[0]?.organization_id ?? null;
}

export async function resolveOrganizationId(request: Request, userId: string) {
  const requested =
    new URL(request.url).searchParams.get("organizationId") ??
    request.headers.get("x-organization-id");
  if (requested) return requested;
  return getDefaultOrganizationId(userId);
}

export async function requireOrganizationMembership(
  organizationId: string,
  roles: OrganizationRole[] = ["owner", "admin", "editor", "viewer", "billing"],
  authenticatedUser?: User,
) {
  const user = authenticatedUser ?? await getAuthenticatedUser();
  if (!user) return { ok: false as const, status: 401 as const };

  const { data, error } = await getSupabaseAdmin()
    .from("organization_memberships")
    .select("organization_id,user_id,role,status,created_at,updated_at")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  const membership = data as OrganizationMembership | null;
  if (!membership || !roles.some((role) => ROLE_ORDER[membership.role] >= ROLE_ORDER[role])) {
    return { ok: false as const, status: 403 as const, user };
  }
  return { ok: true as const, user, membership };
}

export async function requireOrganizationAccess(
  organizationId: string,
  roles: OrganizationRole[] = ["owner", "admin", "editor", "viewer", "billing"],
  authenticatedUser?: User,
) {
  const direct = await requireOrganizationMembership(
    organizationId,
    roles,
    authenticatedUser,
  );
  if (direct.ok || direct.status === 401) return direct;

  const user = direct.user ?? authenticatedUser ?? await getAuthenticatedUser();
  if (!user) return { ok: false as const, status: 401 as const };
  const { data, error } = await getSupabaseAdmin()
    .from("agency_client_access")
    .select("agency_organization_id,role")
    .eq("client_organization_id", organizationId)
    .eq("status", "active");
  if (error) throw error;
  const agencyIds = (data ?? []).map((item) => item.agency_organization_id);
  if (!agencyIds.length) return { ok: false as const, status: 403 as const, user };
  const { data: agencyMemberships, error: membershipError } = await getSupabaseAdmin()
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("organization_id", agencyIds);
  if (membershipError) throw membershipError;
  const allowed = (agencyMemberships ?? []).some((membership) => {
    const delegated = data.find((item) => item.agency_organization_id === membership.organization_id)?.role as OrganizationRole | undefined;
    const agencyRole = membership.role as OrganizationRole;
    return delegated && roles.some((role) => ROLE_ORDER[agencyRole] >= ROLE_ORDER[role] && ROLE_ORDER[delegated] >= ROLE_ORDER[role]);
  });
  if (!allowed) return { ok: false as const, status: 403 as const, user };
  return { ok: true as const, user, membership: { organization_id: organizationId, user_id: user.id, role: "admin" as const, status: "active" as const } };
}

export async function requireProjectAccess(
  projectId: string,
  roles: OrganizationRole[] = ["owner", "admin", "editor", "viewer", "billing"],
  authenticatedUser?: User,
  knownOrganizationId?: string,
) {
  let organizationId: string;
  if (knownOrganizationId) {
    organizationId = knownOrganizationId;
  } else {
    const { data, error } = await getSupabaseAdmin()
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false as const, status: 404 as const };
    organizationId = data.organization_id;
  }

  const access = await requireOrganizationAccess(
    organizationId,
    roles,
    authenticatedUser,
  );
  if (!access.ok) return access;
  return { ...access, projectOrganizationId: organizationId };
}

export function unauthorizedResponse(status: 401 | 403 | 404) {
  return Response.json(
    { error: status === 401 ? "Autenticação necessária." : status === 404 ? "Recurso não encontrado." : "Permissão insuficiente." },
    { status },
  );
}

export async function requireAdminResponse() {
  const result = await requireAdminContext();
  return result.ok ? null : result.response;
}

export async function requireAdminContext() {
  const user = await getAuthenticatedUser();
  if (user) return { ok: true as const, user };

  return {
    ok: false as const,
    response: Response.json(
      { error: "Acesso administrativo não autorizado." },
      { status: 401 },
    ),
  };
}
