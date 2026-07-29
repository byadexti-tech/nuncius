import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth";
import { recordSecurityEvent } from "@/lib/observability";

type Context = { params: Promise<{ invitationId: string }> };

export async function POST(request: Request, context: Context) {
  const user = await getAuthenticatedUser();
  if (!user) return unauthorizedResponse(401);
  const { invitationId } = await context.params;
  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  if (!body?.token) return Response.json({ error: "Token do convite é obrigatório." }, { status: 400 });
  const tokenHash = createHash("sha256").update(body.token).digest("hex");
  const supabase = getSupabaseAdmin();
  const { data: invitation, error } = await supabase.from("organization_invitations").select("id,organization_id,email,role,status,expires_at").eq("id", invitationId).eq("token_hash", tokenHash).maybeSingle();
  if (error) throw error;
  if (!invitation || invitation.status !== "pending" || new Date(invitation.expires_at) <= new Date()) return Response.json({ error: "Convite inválido ou expirado." }, { status: 410 });
  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) return Response.json({ error: "Este convite pertence a outro e-mail." }, { status: 403 });
  const { error: membershipError } = await supabase.from("organization_memberships").upsert({ organization_id: invitation.organization_id, user_id: user.id, role: invitation.role, status: "active" });
  if (membershipError) throw membershipError;
  const { error: updateError } = await supabase.from("organization_invitations").update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() }).eq("id", invitation.id);
  if (updateError) throw updateError;
  await recordSecurityEvent({ headers: request.headers, eventType: "membership.updated", outcome: "success", actorUserId: user.id, resourceType: "invitation", resourceId: invitation.id });
  return Response.json({ organizationId: invitation.organization_id, role: invitation.role });
}
