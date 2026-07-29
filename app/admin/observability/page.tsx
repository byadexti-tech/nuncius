import { redirect } from "next/navigation";
import { ObservabilityDashboard } from "@/components/observability-dashboard";
import { getAuthenticatedUser, getDefaultOrganizationId, requireOrganizationAccess } from "@/lib/auth";
import {
  getObservabilityData,
  logError,
  type ObservabilitySummary,
  type SecurityAuditEvent,
} from "@/lib/observability";

export const dynamic = "force-dynamic";

type Range = "24h" | "7d" | "30d";

const RANGE_HOURS: Record<Range, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

function getRangeStart(range: Range) {
  return new Date(Date.now() - RANGE_HOURS[range] * 60 * 60 * 1000);
}

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

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/admin/login");
  const organizationId = await getDefaultOrganizationId(user.id);
  if (!organizationId || !(await requireOrganizationAccess(organizationId)).ok) redirect("/admin");

  const requestedRange = (await searchParams).range;
  const range: Range =
    requestedRange === "24h" ||
    requestedRange === "7d" ||
    requestedRange === "30d"
      ? requestedRange
      : "7d";
  const since = getRangeStart(range);

  let summary = EMPTY_SUMMARY;
  let audits: SecurityAuditEvent[] = [];
  let error: string | null = null;
  try {
    const data = await getObservabilityData(since);
    summary = data.summary;
    audits = data.audits;
  } catch (loadError) {
    logError("observability_dashboard_load_failed", loadError, {
      route: "/admin/observability",
      range,
    });
    error = "Não foi possível carregar os dados de observabilidade.";
  }

  return (
    <ObservabilityDashboard
      range={range}
      summary={summary}
      audits={audits}
      error={error}
    />
  );
}
