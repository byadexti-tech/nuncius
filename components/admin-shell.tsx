"use client";

import Link from "next/link";
import { Activity, Bot, Building2, LayoutDashboard, Menu, Settings, X, LogOut } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin#projects", label: "Empresas", icon: Building2 },
  { href: "/admin/observability", label: "Observabilidade", icon: Activity },
];

export function AdminShell({ children, email, projectName }: { children: React.ReactNode; email: string; projectName?: string }) {
  const [open, setOpen] = useState(false);
  const navigation = <>
    <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-4"><div className="grid size-8 place-items-center rounded-lg bg-violet-500 text-white"><Bot className="size-4" /></div><span className="text-base font-semibold text-white">Nuncius</span></div>
    <nav className="flex-1 space-y-1 p-2">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"><Icon className="size-4" />{label}</Link>)}<Link href="/admin/settings" onClick={() => setOpen(false)} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"><Settings className="size-4" />Configurações</Link></nav>
  </>;
  return <div className="min-h-screen bg-slate-50 text-slate-950"><aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col bg-slate-950 lg:flex">{navigation}</aside>{open ? <div className="fixed inset-0 z-40 lg:hidden"><button className="absolute inset-0 bg-slate-950/40" aria-label="Fechar menu" onClick={() => setOpen(false)} /><aside className="relative flex h-full w-64 flex-col bg-slate-950"><button className="absolute right-3 top-3 text-slate-300" onClick={() => setOpen(false)}><X className="size-5" /></button>{navigation}</aside></div> : null}<div className="lg:pl-56"><header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-5 lg:px-6"><Button size="icon" variant="ghost" className="mr-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu className="size-5" /></Button><div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">Workspace <span className="text-slate-300">/</span><Link href="/admin" className="hover:text-slate-950">Empresas</Link>{projectName ? <><span className="text-slate-300">/</span><span className="max-w-52 truncate font-medium text-slate-800">{projectName}</span><span className="text-slate-300">/</span><span className="font-medium text-slate-800">Snippets</span></> : null}</div><div className="ml-auto flex items-center gap-2"><span className="hidden max-w-48 truncate text-sm text-slate-500 sm:block">{email}</span><form action={logout}><Button type="submit" size="icon" variant="ghost" aria-label="Sair"><LogOut className="size-4" /></Button></form></div></header><main>{children}</main></div></div>;
}
