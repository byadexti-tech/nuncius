"use client";

import Link from "next/link";
import { Bot, CheckCircle2, ShieldCheck } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { LoginForm } from "@/components/login-form";
import { useI18n } from "@/lib/i18n";

export default function AdminLoginPage() {
  const { t } = useI18n();
  const benefits = [
    t("login.benefitRestricted"),
    t("login.benefitSession"),
    t("login.benefitWebhook"),
  ];

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(124,58,237,0.34),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.18),transparent_35%)]" />
        <Link href="/" className="relative flex items-center gap-3 text-white">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-500">
            <Bot className="size-5" />
          </span>
          <span className="text-xl font-semibold tracking-tight">Nuncius</span>
        </Link>

        <div className="relative my-auto max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-200">
            <ShieldCheck className="size-3.5" />
            {t("login.secureArea")}
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
            {t("login.heroLine1")}
            <br />
            {t("login.heroLine2")}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
            {t("login.heroDescription")}
          </p>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            {benefits.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="size-4 text-violet-400" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} Nuncius
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-white px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-end">
            <LanguageSelector />
          </div>
          <Link
            href="/"
            className="mb-12 flex items-center gap-2.5 text-slate-950 lg:hidden"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">
              <Bot className="size-4" />
            </span>
            <span className="font-semibold">Nuncius</span>
          </Link>
          <p className="text-sm font-medium text-violet-600">
            {t("login.welcome")}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {t("login.title")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {t("login.description")}
          </p>
          <LoginForm />
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            {t("login.monitoring")}
          </p>
        </div>
      </section>
    </main>
  );
}
