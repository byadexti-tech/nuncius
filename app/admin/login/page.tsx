import Link from "next/link";
import { Bot, CheckCircle2, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
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
            Área administrativa segura
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
            Seus assistentes,
            <br />
            sob seu controle.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
            Gerencie projetos, webhooks e snippets de incorporação em um único
            lugar.
          </p>
          <div className="mt-10 space-y-4 text-sm text-slate-300">
            {[
              "Acesso restrito a administradores",
              "Sessão segura gerenciada pelo Supabase",
              "Webhooks protegidos no servidor",
            ].map((item) => (
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
          <Link
            href="/"
            className="mb-12 flex items-center gap-2.5 text-slate-950 lg:hidden"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">
              <Bot className="size-4" />
            </span>
            <span className="font-semibold">Nuncius</span>
          </Link>
          <p className="text-sm font-medium text-violet-600">Bem-vindo de volta</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Acesse sua conta
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Use as credenciais administrativas para continuar.
          </p>
          <LoginForm />
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            O acesso é monitorado e restrito a usuários autorizados.
          </p>
        </div>
      </section>
    </main>
  );
}
