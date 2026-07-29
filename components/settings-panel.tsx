"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { useI18n } from "@/lib/i18n";
import { useTheme, type ThemePreference } from "@/lib/theme";

export function SettingsPanel() {
  const { t } = useI18n();
  const { preference, setPreference } = useTheme();
  const themes: { value: ThemePreference; icon: typeof Monitor; label: string }[] = [
    { value: "system", icon: Monitor, label: t("admin.themeSystem") },
    { value: "light", icon: Sun, label: t("admin.themeLight") },
    { value: "dark", icon: Moon, label: t("admin.themeDark") },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-medium text-slate-900">{t("admin.interfaceLanguage")}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t("admin.languageDescription")}</p>
        <div className="mt-4"><LanguageSelector showLabel /></div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-medium text-slate-900">{t("admin.theme")}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t("admin.themeDescription")}</p>
        <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("admin.theme")}>
          {themes.map(({ value, icon: Icon, label }) => {
            const selected = preference === value;
            return <button key={value} type="button" role="radio" aria-checked={selected} onClick={() => setPreference(value)} className={`flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${selected ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-slate-950"}`}><Icon className="size-4" />{label}</button>;
          })}
        </div>
      </section>
    </div>
  );
}
