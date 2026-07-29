import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { userAgent } from "next/server";
import {
  logError,
  logWarning,
} from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export { logError, logInfo, logWarning } from "@/lib/logger";

type HeaderSource = {
  get(name: string): string | null;
};

export type AnalyticsEventType =
  | "widget_loaded"
  | "chat_opened"
  | "message_requested"
  | "message_succeeded"
  | "message_failed";

export type SecurityEventType =
  | "auth.login_succeeded"
  | "auth.login_failed"
  | "auth.access_denied"
  | "auth.logout"
  | "security.rate_limited"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "snippet.created"
  | "snippet.updated"
  | "snippet.duplicated"
  | "snippet.deleted"
  | "snippet.activated"
  | "snippet.deactivated"
  | "snippet.origins_updated"
  | "project.webhook_updated"
  | "project.webhook_tested"
  | "organization.created"
  | "membership.invited"
  | "membership.updated"
  | "membership.removed"
  | "agency.client_linked"
  | "agency.client_revoked";

export type ObservabilityDimension = {
  name: string;
  count: number;
};

export type ObservabilitySummary = {
  widgetLoads: number;
  uniqueSessions: number;
  chatOpens: number;
  messages: number;
  successes: number;
  failures: number;
  successRate: number;
  avgDurationMs: number;
  operatingSystems: ObservabilityDimension[];
  browsers: ObservabilityDimension[];
  devices: ObservabilityDimension[];
  countries: ObservabilityDimension[];
  origins: ObservabilityDimension[];
};

export type SecurityAuditEvent = {
  id: number;
  occurred_at: string;
  event_type: SecurityEventType;
  outcome: "success" | "failure" | "denied" | "blocked";
  actor_user_id: string | null;
  resource_type: "auth" | "project" | "snippet" | "api" | "organization" | "membership" | "invitation" | "agency_access" | null;
  resource_id: string | null;
  country_code: string | null;
  browser_name: string | null;
  os_name: string | null;
  device_type: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
};

const EMPTY_SUMMARY: ObservabilitySummary = {
  widgetLoads: 0,
  uniqueSessions: 0,
  chatOpens: 0,
  messages: 0,
  successes: 0,
  failures: 0,
  successRate: 0,
  avgDurationMs: 0,
  operatingSystems: [],
  browsers: [],
  devices: [],
  countries: [],
  origins: [],
};

function cleanText(value: string | null | undefined, maxLength = 160) {
  if (!value) return null;
  return value.replace(/[\r\n\t]/g, " ").trim().slice(0, maxLength) || null;
}

export function getRequestId(headers: HeaderSource) {
  return (
    cleanText(headers.get("x-request-id")) ??
    cleanText(headers.get("x-vercel-id")) ??
    randomUUID()
  );
}

function privacyHash(value: string | null | undefined) {
  const secret = process.env.AUDIT_HASH_SECRET;
  if (!secret || !value) return null;
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashAuditSubject(value: string) {
  return privacyHash(value.trim().toLowerCase());
}

function getIp(headers: HeaderSource) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    null
  );
}

function getOriginHostname(headers: HeaderSource) {
  const value = headers.get("origin") ?? headers.get("referer");
  if (!value) return null;
  try {
    return new URL(value).hostname.slice(0, 253);
  } catch {
    return null;
  }
}

function getDeviceContext(headers: HeaderSource) {
  const parsed = userAgent({ headers: headers as Headers });
  return {
    ip_hash: privacyHash(getIp(headers)),
    origin_hostname: getOriginHostname(headers),
    country_code:
      cleanText(headers.get("x-vercel-ip-country"), 2)?.toUpperCase() ?? null,
    browser_name: cleanText(parsed.browser.name, 80),
    os_name: cleanText(parsed.os.name, 80),
    device_type: cleanText(parsed.device.type || "desktop", 40),
    is_bot: parsed.isBot,
  };
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return {};

  const safe = Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) =>
        ["string", "number", "boolean"].includes(typeof value),
      )
      .map(([key, value]) => [
        key.slice(0, 60),
        typeof value === "string" ? value.slice(0, 200) : value,
      ]),
  );

  return JSON.stringify(safe).length <= 2000 ? safe : {};
}

export async function recordAnalyticsEvent(input: {
  headers: HeaderSource;
  eventType: AnalyticsEventType;
  outcome?: "success" | "failure" | "skipped" | "blocked";
  projectId?: string | null;
  snippetId?: string | null;
  sessionId?: string | null;
  statusCode?: number | null;
  durationMs?: number | null;
  requestId?: string;
}) {
  const requestId = input.requestId ?? getRequestId(input.headers);
  const device = getDeviceContext(input.headers);

  try {
    const { error } = await getSupabaseAdmin().from("analytics_events").insert({
      event_type: input.eventType,
      outcome: input.outcome ?? "success",
      project_id: input.projectId ?? null,
      snippet_id: input.snippetId ?? null,
      session_hash: privacyHash(input.sessionId),
      status_code: input.statusCode ?? null,
      duration_ms:
        input.durationMs == null
          ? null
          : Math.max(0, Math.min(300000, Math.round(input.durationMs))),
      request_id: requestId,
      ...device,
    });
    if (error) throw error;
  } catch (error) {
    logError("analytics_event_write_failed", error, {
      eventType: input.eventType,
      requestId,
    });
  }
}

export async function recordSecurityEvent(input: {
  headers: HeaderSource;
  eventType: SecurityEventType;
  outcome: "success" | "failure" | "denied" | "blocked";
  actorUserId?: string | null;
  subjectHash?: string | null;
  resourceType?: "auth" | "project" | "snippet" | "api" | "organization" | "membership" | "invitation" | "agency_access" | null;
  resourceId?: string | null;
  requestId?: string;
  metadata?: Record<string, unknown>;
}) {
  const requestId = input.requestId ?? getRequestId(input.headers);
  const device = getDeviceContext(input.headers);

  try {
    const { error } = await getSupabaseAdmin()
      .from("security_audit_events")
      .insert({
        event_type: input.eventType,
        outcome: input.outcome,
        actor_user_id: input.actorUserId ?? null,
        subject_hash: input.subjectHash ?? null,
        resource_type: input.resourceType ?? null,
        resource_id: input.resourceId ?? null,
        ip_hash: device.ip_hash,
        country_code: device.country_code,
        browser_name: device.browser_name,
        os_name: device.os_name,
        device_type: device.device_type,
        request_id: requestId,
        metadata: sanitizeMetadata(input.metadata),
      });
    if (error) throw error;
  } catch (error) {
    logError("security_audit_write_failed", error, {
      eventType: input.eventType,
      requestId,
    });
  }
}

export async function consumeRateLimit(input: {
  headers: HeaderSource;
  scope: string;
  maxRequests: number;
  windowSeconds: number;
}) {
  const ipHash = privacyHash(getIp(input.headers));
  if (!ipHash) {
    logWarning("rate_limit_disabled", {
      scope: input.scope,
      reason: process.env.AUDIT_HASH_SECRET
        ? "client_ip_unavailable"
        : "audit_hash_secret_missing",
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  const windowMs = input.windowSeconds * 1000;
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const expiresAtMs = windowStartMs + windowMs;

  try {
    const { data, error } = await getSupabaseAdmin().rpc(
      "consume_rate_limit",
      {
        p_scope: input.scope,
        p_key_hash: ipHash,
        p_window_started_at: new Date(windowStartMs).toISOString(),
        p_expires_at: new Date(expiresAtMs).toISOString(),
        p_max_requests: input.maxRequests,
      },
    );
    if (error) throw error;
    return {
      allowed: data === true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((expiresAtMs - now) / 1000),
      ),
    };
  } catch (error) {
    logError("rate_limit_check_failed", error, { scope: input.scope });
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

function normalizeSummary(value: unknown): ObservabilitySummary {
  if (!value || typeof value !== "object") return EMPTY_SUMMARY;
  const raw = value as Record<string, unknown>;
  const number = (key: string) =>
    typeof raw[key] === "number" ? raw[key] : Number(raw[key]) || 0;
  const dimensions = (key: string) =>
    Array.isArray(raw[key])
      ? (raw[key] as Array<Record<string, unknown>>).map((item) => ({
          name: String(item.name ?? "Desconhecido"),
          count: Number(item.count) || 0,
        }))
      : [];

  return {
    widgetLoads: number("widgetLoads"),
    uniqueSessions: number("uniqueSessions"),
    chatOpens: number("chatOpens"),
    messages: number("messages"),
    successes: number("successes"),
    failures: number("failures"),
    successRate: number("successRate"),
    avgDurationMs: number("avgDurationMs"),
    operatingSystems: dimensions("operatingSystems"),
    browsers: dimensions("browsers"),
    devices: dimensions("devices"),
    countries: dimensions("countries"),
    origins: dimensions("origins"),
  };
}

export async function getObservabilityData(since: Date) {
  const supabase = getSupabaseAdmin();
  const [{ data: summary, error: summaryError }, { data: audits, error: auditError }] =
    await Promise.all([
      supabase.rpc("get_observability_summary", {
        p_since: since.toISOString(),
      }),
      supabase
        .from("security_audit_events")
        .select(
          "id,occurred_at,event_type,outcome,actor_user_id,resource_type,resource_id,country_code,browser_name,os_name,device_type,request_id,metadata",
        )
        .gte("occurred_at", since.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(50),
    ]);

  if (summaryError) throw summaryError;
  if (auditError) throw auditError;

  return {
    summary: normalizeSummary(summary),
    audits: (audits ?? []) as SecurityAuditEvent[],
  };
}
