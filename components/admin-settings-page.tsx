"use client";

import { SettingsPanel } from "@/components/settings-panel";
import { useI18n } from "@/lib/i18n";

export function AdminSettingsPage() {
  const { t } = useI18n();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t("admin.settingsTitle")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{t("admin.settingsDescription")}</p>
        <div className="mt-8"><SettingsPanel /></div>
      </div>
    </main>
  );
}
