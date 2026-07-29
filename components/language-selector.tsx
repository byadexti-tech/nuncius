"use client";

import { Languages } from "lucide-react";
import { useI18n, type LocalePreference } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSelector({
  variant = "light",
  showLabel = false,
}: {
  variant?: "light" | "dark";
  showLabel?: boolean;
}) {
  const { preference, setLocale, t } = useI18n();

  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-sm",
        variant === "dark" ? "text-slate-300" : "text-slate-600",
      )}
    >
      <Languages className="size-4 shrink-0" aria-hidden="true" />
      {showLabel ? <span>{t("common.language")}</span> : null}
      <select
        className={cn(
          "h-9 rounded-lg border px-2.5 text-sm outline-none transition-colors focus:ring-2",
          variant === "dark"
            ? "border-white/15 bg-slate-900 text-white focus:border-violet-400 focus:ring-violet-500/20"
            : "border-slate-200 bg-white text-slate-700 focus:border-violet-400 focus:ring-violet-100",
        )}
        aria-label={t("common.language")}
        value={preference}
        onChange={(event) => setLocale(event.target.value as LocalePreference)}
      >
        <option value="system">{t("common.automatic")}</option>
        <option value="pt-BR">{t("common.portuguese")}</option>
        <option value="en">{t("common.english")}</option>
      </select>
    </label>
  );
}
