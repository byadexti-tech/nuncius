import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Code2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Webhook,
} from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "Instale com uma linha",
    description:
      "Copie o snippet, cole no seu site e o widget começa a funcionar.",
  },
  {
    icon: Webhook,
    title: "Conectado ao seu n8n",
    description:
      "Cada projeto aponta para um workflow diferente, sem expor o webhook.",
  },
  {
    icon: MessageCircle,
    title: "Conversa persistente",
    description:
      "O visitante mantém a mesma sessão enquanto navega pelo seu site.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <header className="relative z-20 border-b border-white/10">
        <div className="mx-auto flex h-18 max-w-7xl items-center px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-500 shadow-lg shadow-violet-950/40">
              <Bot className="size-5" />
            </span>
            <span className="text-xl font-semibold tracking-tight">Nuncius</span>
          </Link>
          <nav
            className="ml-auto hidden items-center gap-8 text-sm text-slate-400 md:flex"
            aria-label="Navegação pública"
          >
            <a href="#como-funciona" className="hover:text-white">
              Como funciona
            </a>
            <a href="#recursos" className="hover:text-white">
              Recursos
            </a>
          </nav>
          <Link
            href="/admin/login"
            className="ml-auto inline-flex h-10 items-center justify-center rounded-lg border border-white/15 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 md:ml-8"
          >
            Acessar painel
          </Link>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(124,58,237,0.30),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.15),transparent_28%)]" />
          <div className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-200">
                <Sparkles className="size-3.5" />
                Atendimento inteligente, do seu jeito
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Transforme qualquer site em uma conversa.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
                Crie widgets de chat, conecte seus workflows do n8n e publique
                em minutos — sem reconstruir seu site.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/admin/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-500 px-6 text-sm font-semibold text-white shadow-xl shadow-violet-950/30 transition-all hover:-translate-y-0.5 hover:bg-violet-400"
                >
                  Começar agora
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#como-funciona"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 px-6 text-sm font-medium text-white hover:bg-white/5"
                >
                  Ver como funciona
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-500">
                {["Sem código complexo", "Integração com n8n", "Instalação rápida"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-400" />
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg">
              <div className="absolute -inset-12 rounded-full bg-violet-500/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/40 backdrop-blur">
                <div className="rounded-2xl bg-white p-5 text-slate-950">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
                      <Bot className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Assistente Nuncius</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Online agora
                      </p>
                    </div>
                  </div>
                  <div className="min-h-80 space-y-5 bg-slate-50/80 px-2 py-7">
                    <div className="max-w-[78%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                      Olá! Como posso ajudar você hoje? 👋
                    </div>
                    <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-3 text-sm leading-6 text-white">
                      Quero saber mais sobre o produto.
                    </div>
                    <div className="max-w-[84%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm">
                      Claro! Vou encontrar as melhores informações para você.
                    </div>
                  </div>
                  <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                    <div className="flex h-11 flex-1 items-center rounded-xl border border-slate-200 px-4 text-sm text-slate-400">
                      Digite sua mensagem...
                    </div>
                    <div className="grid size-11 place-items-center rounded-xl bg-violet-600 text-white">
                      <ArrowRight className="size-4" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-xl backdrop-blur sm:flex">
                <span className="grid size-8 place-items-center rounded-lg bg-emerald-400/10 text-emerald-400">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-medium">Webhook protegido</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Credenciais no servidor
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="recursos" className="border-y border-white/10 bg-white/[0.025]">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-violet-400">Tudo conectado</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Do workflow ao seu site, sem atrito.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-violet-400/10 text-violet-300">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-medium text-violet-400">
                Três passos simples
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Publique seu assistente em minutos.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                O Nuncius cuida da conexão, da sessão e da interface. Você cuida
                da inteligência no n8n.
              </p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-3">
              {[
                ["01", "Crie o projeto", "Defina o nome e informe o webhook."],
                ["02", "Copie o snippet", "Uma linha pronta para incorporar."],
                ["03", "Comece a conversar", "O widget aparece no seu site."],
              ].map(([number, title, description]) => (
                <li
                  key={number}
                  className="rounded-2xl border border-white/10 p-5"
                >
                  <span className="font-mono text-xs text-violet-400">
                    {number}
                  </span>
                  <h3 className="mt-5 text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-8">
          <div className="flex items-center gap-2 text-slate-300">
            <Bot className="size-4 text-violet-400" />
            Nuncius
          </div>
          <p className="sm:ml-auto">
            © {new Date().getFullYear()} Nuncius. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
