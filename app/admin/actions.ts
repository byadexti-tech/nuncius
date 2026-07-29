"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  consumeRateLimit,
  getRequestId,
  hashAuditSubject,
  recordSecurityEvent,
} from "@/lib/observability";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listMemberships } from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const requestId = getRequestId(requestHeaders);
  const subjectHash = email ? hashAuditSubject(email) : null;

  const rateLimit = await consumeRateLimit({
    headers: requestHeaders,
    scope: "admin_login",
    maxRequests: 10,
    windowSeconds: 15 * 60,
  });
  if (!rateLimit.allowed) {
    await recordSecurityEvent({
      headers: requestHeaders,
      eventType: "security.rate_limited",
      outcome: "blocked",
      subjectHash,
      resourceType: "auth",
      requestId,
      metadata: { scope: "admin_login" },
    });
    return {
      error: "Muitas tentativas de acesso. Aguarde alguns minutos.",
    };
  }

  if (!email || !email.includes("@") || password.length < 8) {
    await recordSecurityEvent({
      headers: requestHeaders,
      eventType: "auth.login_failed",
      outcome: "failure",
      subjectHash,
      resourceType: "auth",
      requestId,
      metadata: { reason: "invalid_input" },
    });
    return { error: "Informe um e-mail e uma senha válidos." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordSecurityEvent({
      headers: requestHeaders,
      eventType: "auth.login_failed",
      outcome: "failure",
      subjectHash,
      resourceType: "auth",
      requestId,
      metadata: { reason: "invalid_credentials" },
    });
    return { error: "E-mail ou senha incorretos." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || (await listMemberships(user.id)).length === 0) {
    await recordSecurityEvent({
      headers: requestHeaders,
      eventType: "auth.access_denied",
      outcome: "denied",
      actorUserId: undefined,
      subjectHash,
      resourceType: "auth",
      requestId,
      metadata: { reason: "authenticated_user_required" },
    });
    await supabase.auth.signOut();
    return { error: "Não foi possível validar o acesso desta conta." };
  }

  await recordSecurityEvent({
    headers: requestHeaders,
    eventType: "auth.login_succeeded",
    outcome: "success",
    actorUserId: user.id,
    subjectHash,
    resourceType: "auth",
    requestId,
  });
  redirect("/admin");
}

export async function logout() {
  const requestHeaders = await headers();
  const requestId = getRequestId(requestHeaders);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await recordSecurityEvent({
    headers: requestHeaders,
    eventType: "auth.logout",
    outcome: "success",
    actorUserId: user?.id,
    resourceType: "auth",
    requestId,
  });
  await supabase.auth.signOut();
  redirect("/admin/login");
}
