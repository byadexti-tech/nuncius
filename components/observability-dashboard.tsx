"use client";

import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  Gauge,
  MessageSquare,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import type {
  ObservabilityDimension,
  ObservabilitySummary,
  SecurityAuditEvent,
  SecurityEventType,
} from "@/lib/observability";

type Range = "24h" | "7d" | "30d";

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card className="p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
          {detail ? (
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          ) : null}
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}

function DimensionCard({
  title,
  values,
}: {
  title: string;
  values: ObservabilityDimension[];
}) {
  const max = Math.max(...values.map((item) => item.count), 1);

  return (
    <Card className="p-5 shadow-sm">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {values.length ? (
          values.map((item) => (
            <div key={item.name}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-600">{item.name}</span>
                <span className="font-medium text-slate-900">{item.count}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">—</p>
        )}
      </div>
    </Card>
  );
}

export function ObservabilityDashboard({
  range,
  summary,
  audits,
  error,
}: {
  range: Range;
  summary: ObservabilitySummary;
  audits: SecurityAuditEvent[];
  error: string | null;
}) {
  const { locale, t } = useI18n();
  const eventLabels: Record<SecurityEventType, string> =
    locale === "en"
      ? {
          "auth.login_succeeded": "Admin sign-in",
          "auth.login_failed": "Failed sign-in",
          "auth.access_denied": "Access denied",
          "auth.logout": "Admin sign-out",
          "security.rate_limited": "Rate limit",
          "project.created": "Company created",
          "project.updated": "Company updated",
          "project.deleted": "Company deleted",
          "snippet.created": "Snippet created",
          "snippet.updated": "Snippet updated",
          "snippet.duplicated": "Snippet duplicated",
          "snippet.deleted": "Snippet deleted",
          "snippet.activated": "Snippet activated",
          "snippet.deactivated": "Snippet deactivated",
          "snippet.origins_updated": "Snippet origins updated",
          "project.webhook_updated": "Webhook updated",
          "project.webhook_tested": "Webhook tested",
          "organization.created": "Organization created",
          "membership.invited": "Member invited",
          "membership.updated": "Membership updated",
          "membership.removed": "Member removed",
          "agency.client_linked": "Agency client linked",
          "agency.client_revoked": "Agency client revoked",
        }
      : {
          "auth.login_succeeded": "Login administrativo",
          "auth.login_failed": "Falha no login",
          "auth.access_denied": "Acesso negado",
          "auth.logout": "Logout administrativo",
          "security.rate_limited": "Limite de requisições",
          "project.created": "Empresa criada",
          "project.updated": "Empresa atualizada",
          "project.deleted": "Empresa excluída",
          "snippet.created": "Snippet criado",
          "snippet.updated": "Snippet atualizado",
          "snippet.duplicated": "Snippet duplicado",
          "snippet.deleted": "Snippet excluído",
          "snippet.activated": "Snippet ativado",
          "snippet.deactivated": "Snippet desativado",
          "snippet.origins_updated": "Origens do snippet atualizadas",
          "project.webhook_updated": "Webhook atualizado",
          "project.webhook_tested": "Webhook testado",
          "organization.created": "Organização criada",
          "membership.invited": "Membro convidado",
          "membership.updated": "Vínculo atualizado",
          "membership.removed": "Membro removido",
          "agency.client_linked": "Cliente vinculado à agência",
          "agency.client_revoked": "Cliente desvinculado da agência",
        };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {t("observability.title")}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {t("observability.description")}
            </p>
          </div>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="ml-auto hidden items-center gap-2 text-sm font-medium text-violet-700 hover:text-violet-900 sm:flex"
          >
            Vercel Analytics
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-violet-600">
              {t("observability.privacy")}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {t("observability.summary")}
            </h2>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(["24h", "7d", "30d"] as const).map((option) => (
              <Link
                key={option}
                href={`/admin/observability?range=${option}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  range === option
                    ? "bg-violet-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option}
              </Link>
            ))}
          </div>
        </div>

        {error ? (
          <p
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Eye}
            label={t("observability.widgetLoads")}
            value={summary.widgetLoads.toLocaleString(locale)}
          />
          <MetricCard
            icon={Users}
            label={t("observability.uniqueSessions")}
            value={summary.uniqueSessions.toLocaleString(locale)}
            detail={t("observability.approximate")}
          />
          <MetricCard
            icon={MessageSquare}
            label={t("observability.chatOpens")}
            value={summary.chatOpens.toLocaleString(locale)}
          />
          <MetricCard
            icon={Bot}
            label={t("observability.messages")}
            value={summary.messages.toLocaleString(locale)}
          />
          <MetricCard
            icon={CheckCircle2}
            label={t("observability.successRate")}
            value={`${summary.successRate.toLocaleString(locale)}%`}
            detail={`${summary.successes} ${t("observability.successes")} · ${summary.failures} ${t("observability.failures")}`}
          />
          <MetricCard
            icon={Clock3}
            label={t("observability.averageLatency")}
            value={`${summary.avgDurationMs.toLocaleString(locale)} ms`}
          />
          <MetricCard
            icon={ShieldCheck}
            label={t("observability.auditEvents")}
            value={audits.length.toLocaleString(locale)}
            detail={t("observability.latestEvents")}
          />
          <MetricCard
            icon={Gauge}
            label={t("observability.period")}
            value={range}
            detail={t("observability.retention")}
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <DimensionCard
            title={t("observability.operatingSystems")}
            values={summary.operatingSystems}
          />
          <DimensionCard
            title={t("observability.browsers")}
            values={summary.browsers}
          />
          <DimensionCard
            title={t("observability.devices")}
            values={summary.devices}
          />
          <DimensionCard
            title={t("observability.countries")}
            values={summary.countries}
          />
          <DimensionCard
            title={t("observability.origins")}
            values={summary.origins}
          />
        </div>

        <Card className="mt-8 overflow-hidden shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-950">
              {t("observability.securityTimeline")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("observability.securityDescription")}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {audits.length ? (
              audits.map((event) => {
                const denied =
                  event.outcome === "denied" ||
                  event.outcome === "failure" ||
                  event.outcome === "blocked";
                return (
                  <div
                    key={event.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-full ${
                        denied
                          ? "bg-red-50 text-red-600"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {denied ? (
                        <XCircle className="size-4" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {eventLabels[event.event_type]}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {[
                          event.country_code,
                          event.os_name,
                          event.browser_name,
                          event.actor_user_id
                            ? `user:${event.actor_user_id.slice(0, 8)}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || t("observability.noDeviceData")}
                      </p>
                    </div>
                    <time
                      className="text-xs text-slate-500"
                      dateTime={event.occurred_at}
                    >
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(event.occurred_at))}
                    </time>
                  </div>
                );
              })
            ) : (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                {t("observability.noAuditEvents")}
              </p>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
