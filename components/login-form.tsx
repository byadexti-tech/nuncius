"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole, LoaderCircle, Mail } from "lucide-react";
import { login, type LoginState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

const INITIAL_STATE: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const { locale, t } = useI18n();

  return (
    <form action={action} className="mt-8 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">{t("login.email")}</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("login.emailPlaceholder")}
            className="h-11 pl-10"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("login.password")}</Label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder={t("login.passwordPlaceholder")}
            className="h-11 px-10"
            minLength={8}
            required
          />
          <button
            type="button"
            className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1"
            aria-label={
              showPassword ? t("login.hidePassword") : t("login.showPassword")
            }
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {state.error ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          role="alert"
        >
          {locale === "en" ? "Incorrect email or password." : state.error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {pending ? t("login.submitting") : t("login.submit")}
      </Button>
    </form>
  );
}
