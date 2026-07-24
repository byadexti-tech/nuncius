"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CircleHelp,
  ExternalLink,
  Building2,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/admin/actions";
import { SnippetManager } from "@/components/snippet-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Project } from "@/lib/types";

type FormState = { name: string; webhookUrl: string };
const EMPTY_FORM: FormState = { name: "", webhookUrl: "" };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "Não foi possível concluir a operação.");
  }
  return data;
}

function ProjectModal({
  project,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  project: Project | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (form: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(
    project
      ? { name: project.name, webhookUrl: project.webhook_url }
      : EMPTY_FORM,
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="project-modal-title"
              className="text-xl font-semibold tracking-tight text-slate-950"
            >
              {project ? "Editar empresa" : "Nova empresa"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Conecte o widget ao fluxo que responderá as mensagens.
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Fechar"
            onClick={onClose}
            disabled={saving}
          >
            <X className="size-4" />
          </Button>
        </div>

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSubmit(form);
          }}
          className="mt-6 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="project-name">Nome</Label>
            <Input
              id="project-name"
              placeholder="Ex.: Atendimento comercial"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              minLength={2}
              maxLength={80}
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-webhook">Webhook do n8n</Label>
            <Input
              id="project-webhook"
              type="url"
              placeholder="https://n8n.exemplo.com/webhook/..."
              value={form.webhookUrl}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  webhookUrl: event.target.value,
                }))
              }
              required
            />
            <p className="text-xs leading-5 text-slate-500">
              O Nuncius enviará{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5">
                projectId, sessionId, message
              </code>{" "}
              via POST.
            </p>
          </div>
          {error ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {project ? "Salvar alterações" : "Criar empresa"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({
  project,
  deleting,
  error,
  onClose,
  onConfirm,
}: {
  project: Project;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
      >
        <div className="grid size-11 place-items-center rounded-full bg-red-50 text-red-600">
          <Trash2 className="size-5" />
        </div>
        <h2
          id="delete-project-title"
          className="mt-4 text-lg font-semibold text-slate-950"
        >
          Excluir “{project.name}”?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Todos os snippets dessa empresa deixarão de responder imediatamente.
          Esta ação não pode ser desfeita.
        </p>
        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Excluir empresa
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onManageSnippets,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onManageSnippets: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card className="group flex min-h-64 flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-950/5">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <Bot className="size-5" />
          </div>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Ações de ${project.name}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
            >
              <MoreHorizontal className="size-4" />
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 top-10 z-10 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                >
                  <Pencil className="size-3.5" />
                  Editar
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Excluir
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <h3 className="mt-5 truncate text-base font-semibold text-slate-950">
          {project.name}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Ativo
          <span className="text-slate-300">·</span>
          Criado em{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "short",
          }).format(new Date(project.created_at))}
        </div>
        <div className="mt-5 rounded-lg border border-violet-100 bg-violet-50/60 p-3">
          <p className="text-xs font-medium text-violet-700">
            Snippets independentes
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Configure ícone, cor, tema e posição para cada site.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <Button
          variant="outline"
          className="h-9 w-full justify-center bg-white"
          onClick={onManageSnippets}
        >
          <Bot className="size-4" />
          Gerenciar snippets
        </Button>
      </div>
    </Card>
  );
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalProject, setModalProject] = useState<
    Project | null | undefined
  >(undefined);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [snippetProject, setSnippetProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await requestJson<{ projects: Project[] }>("/api/projects");
      setProjects(data.projects);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Erro ao carregar projetos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadProjects();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedQuery) return projects;
    return projects.filter((project) =>
      project.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery),
    );
  }, [projects, query]);

  async function saveProject(form: FormState) {
    setSaving(true);
    setActionError(null);
    try {
      const isEditing = Boolean(modalProject);
      const url = isEditing
        ? `/api/projects/${modalProject?.id}`
        : "/api/projects";
      const data = await requestJson<{ project: Project }>(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setProjects((current) =>
        isEditing
          ? current.map((project) =>
              project.id === data.project.id ? data.project : project,
            )
          : [data.project, ...current],
      );
      setModalProject(undefined);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Erro ao salvar projeto.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteProject) return;
    setSaving(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/projects/${deleteProject.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || "Não foi possível excluir o projeto.");
      }
      setProjects((current) =>
        current.filter((project) => project.id !== deleteProject.id),
      );
      setDeleteProject(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Erro ao excluir projeto.",
      );
    } finally {
      setSaving(false);
    }
  }

  const navigation = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="grid size-9 place-items-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-950/30">
          <Bot className="size-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">
          Nuncius
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Navegação principal">
        <a
          href="#"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LayoutDashboard className="size-4" />
          Visão geral
        </a>
        <a
          href="#projects"
          className="flex items-center gap-3 rounded-lg bg-violet-500/15 px-3 py-2.5 text-sm font-medium text-violet-300"
        >
          <Building2 className="size-4" />
          Empresas
          <span className="ml-auto rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] text-violet-300">
            {projects.length}
          </span>
        </a>
        <a
          href="#"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <Settings className="size-4" />
          Configurações
        </a>
      </nav>
      <div className="border-t border-slate-800 p-3">
        <a
          href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <CircleHelp className="size-4" />
          Como configurar
          <ExternalLink className="ml-auto size-3" />
        </a>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-slate-950 lg:flex">
        {navigation}
      </aside>
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Fechar menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-slate-950">
            {navigation}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Button
            size="icon"
            variant="ghost"
            className="mr-2 lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
            Workspace
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-800">Empresas</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-52 truncate text-sm text-slate-500 md:block">
              {adminEmail}
            </span>
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
          </div>
        </header>

        <main id="projects" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-violet-600">
                Central de atendimento
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                Empresas
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Gerencie empresas e seus snippets de atendimento.
              </p>
            </div>
            <Button
              className="shrink-0"
              onClick={() => {
                setActionError(null);
                setModalProject(null);
              }}
            >
              <Plus className="size-4" />
              Nova empresa
            </Button>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Buscar empresas..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Buscar empresas"
              />
            </div>
            <span className="hidden text-sm text-slate-500 sm:block">
              {projects.length} {projects.length === 1 ? "empresa" : "empresas"}
            </span>
          </div>

          {pageError ? (
            <div
              className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center"
              role="alert"
            >
              <div>
                <p className="font-medium">A conexão precisa de atenção</p>
                <p className="mt-1 text-amber-800">{pageError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadProjects}>
                Tentar novamente
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className="grid min-h-72 place-items-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="size-4 animate-spin text-violet-600" />
                Carregando projetos...
              </div>
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={() => {
                    setActionError(null);
                    setModalProject(project);
                  }}
                  onDelete={() => {
                    setActionError(null);
                    setDeleteProject(project);
                  }}
                  onManageSnippets={() => setSnippetProject(project)}
                />
              ))}
            </div>
          ) : (
            <Card className="mt-6 grid min-h-80 place-items-center border-dashed p-8 text-center shadow-none">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-xl bg-violet-50 text-violet-600">
                  <Building2 className="size-5" />
                </div>
                <h2 className="mt-4 font-semibold text-slate-900">
                  {query ? "Nenhuma empresa encontrada" : "Sua primeira empresa"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  {query
                    ? "Tente buscar com outro nome."
                    : "Cadastre um webhook do n8n e configure um ou mais snippets para incorporar."}
                </p>
                {!query ? (
                  <Button className="mt-5" onClick={() => setModalProject(null)}>
                    <Plus className="size-4" />
                    Criar empresa
                  </Button>
                ) : null}
              </div>
            </Card>
          )}
        </main>
      </div>

      {modalProject !== undefined ? (
        <ProjectModal
          project={modalProject}
          saving={saving}
          error={actionError}
          onClose={() => setModalProject(undefined)}
          onSubmit={saveProject}
        />
      ) : null}
      {deleteProject ? (
        <DeleteModal
          project={deleteProject}
          deleting={saving}
          error={actionError}
          onClose={() => setDeleteProject(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
      {snippetProject ? (
        <SnippetManager
          project={snippetProject}
          onClose={() => setSnippetProject(null)}
        />
      ) : null}
    </div>
  );
}
