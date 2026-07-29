"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bot,
  CircleHelp,
  ExternalLink,
  Building2,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
  LogOut,
} from "lucide-react";
import { logout } from "@/app/admin/actions";
import { LanguageSelector } from "@/components/language-selector";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n, type Locale } from "@/lib/i18n";
import { useTheme, type ThemePreference } from "@/lib/theme";
import type { Organization, OrganizationRole, Project } from "@/lib/types";

type FormState = { name: string; webhookUrl: string };
const EMPTY_FORM: FormState = { name: "", webhookUrl: "" };

async function requestJson<T>(
  url: string,
  locale: Locale,
  fallbackError: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(
      locale === "pt-BR" && data.error ? data.error : fallbackError,
    );
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
  const { t } = useI18n();
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
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="project-modal-title"
              className="text-xl font-semibold tracking-tight text-slate-950"
            >
              {project ? t("admin.editCompany") : t("admin.newCompany")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("admin.connectFlow")}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("common.close")}
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
          className="mt-5 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="project-name">{t("admin.projectName")}</Label>
            <Input
              id="project-name"
              placeholder={t("admin.projectNamePlaceholder")}
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
            <Label htmlFor="project-webhook">{t("admin.webhook")}</Label>
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
              {t("admin.webhookDescription")}
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
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {project ? t("admin.saveCompany") : t("admin.createCompany")}
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
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
      >
        <div className="grid size-9 place-items-center rounded-full bg-red-50 text-red-600">
          <Trash2 className="size-4" />
        </div>
        <h2
          id="delete-project-title"
          className="mt-4 text-lg font-semibold text-slate-950"
        >
          {t("admin.deleteCompanyTitle").replace("{name}", project.name)}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {t("admin.deleteCompanyDescription")}
        </p>
        {error ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {t("admin.deleteCompany")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { preference, setPreference } = useTheme();
  const themes: { value: ThemePreference; icon: typeof Monitor; label: string }[] = [
    { value: "system", icon: Monitor, label: t("admin.themeSystem") },
    { value: "light", icon: Sun, label: t("admin.themeLight") },
    { value: "dark", icon: Moon, label: t("admin.themeDark") },
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="settings-title"
              className="text-xl font-semibold tracking-tight text-slate-950"
            >
              {t("admin.settingsTitle")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {t("admin.settingsDescription")}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">
            {t("admin.interfaceLanguage")}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {t("admin.languageDescription")}
          </p>
          <div className="mt-4">
            <LanguageSelector showLabel />
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">{t("admin.theme")}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t("admin.themeDescription")}</p>
          <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("admin.theme")}>
            {themes.map(({ value, icon: Icon, label }) => {
              const selected = preference === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPreference(value)}
                  className={`flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${selected ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-slate-950"}`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  canEdit,
  onEdit,
  onDelete,
}: {
  project: Project;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { locale, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card className="group flex min-h-56 flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-950/5">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-600">
            <Bot className="size-4" />
          </div>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              aria-label={t("admin.actionsFor").replace("{name}", project.name)}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((current) => !current)}
              disabled={!canEdit}
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
                  {t("common.edit")}
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                >
                  <Trash2 className="size-3.5" />
                  {t("common.delete")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <h3 className="mt-4 truncate text-sm font-semibold text-slate-950">
          {project.name}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {t("admin.active")}
          <span className="text-slate-300">·</span>
          {t("admin.createdAt")}{" "}
          {new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "short",
          }).format(new Date(project.created_at))}
        </div>
        <div className="mt-4 rounded-md border border-violet-100 bg-violet-50/60 p-2.5">
          <p className="text-xs font-medium text-violet-700">
            {t("admin.independentSnippets")}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {t("admin.independentSnippetsDescription")}
          </p>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <Link
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          href={`/admin/projects/${project.id}/snippets`}
        >
          <Bot className="size-4" />
          {t("admin.manageSnippets")}
        </Link>
      </div>
    </Card>
  );
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const { locale, t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<(Organization & { role: OrganizationRole })[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationRole, setOrganizationRole] = useState<OrganizationRole>("viewer");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [modalProject, setModalProject] = useState<
    Project | null | undefined
  >(undefined);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setPageError(null);
    try {
      const data = await requestJson<{ projects: Project[] }>(
        `/api/projects?organizationId=${organizationId}`,
        locale,
        t("admin.loadError"),
      );
      setProjects(data.projects);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : t("admin.loadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [locale, organizationId, t]);

  useEffect(() => {
    void requestJson<{ organizations: (Organization & { role: OrganizationRole })[] }>(
      "/api/organizations",
      locale,
      t("admin.loadError"),
    ).then((data) => {
      setOrganizations(data.organizations);
      const first = data.organizations[0];
      if (first) {
        setOrganizationId(first.id);
        setOrganizationRole(first.role);
      }
    }).catch((error) => setPageError(error instanceof Error ? error.message : t("admin.loadError")));
  }, [locale, t]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadProjects();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return projects;
    return projects.filter((project) =>
      project.name.toLocaleLowerCase(locale).includes(normalizedQuery),
    );
  }, [locale, projects, query]);

  async function saveProject(form: FormState) {
    setSaving(true);
    setActionError(null);
    try {
      const isEditing = Boolean(modalProject);
      const url = isEditing
        ? `/api/projects/${modalProject?.id}`
        : "/api/projects";
      const data = await requestJson<{ project: Project }>(
        `${url}${url.includes("?") ? "&" : "?"}organizationId=${organizationId}`,
        locale,
        t("admin.saveError"),
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
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
        error instanceof Error ? error.message : t("admin.saveError"),
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
      const response = await fetch(`/api/projects/${deleteProject.id}?organizationId=${organizationId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          locale === "pt-BR" && data.error
            ? data.error
            : t("admin.deleteRequestError"),
        );
      }
      setProjects((current) =>
        current.filter((project) => project.id !== deleteProject.id),
      );
      setDeleteProject(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("admin.deleteError"),
      );
    } finally {
      setSaving(false);
    }
  }

  const navigation = (
    <>
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-4">
        <div className="grid size-8 place-items-center rounded-lg bg-violet-500 text-white shadow-md shadow-violet-950/30">
          <Bot className="size-4" />
        </div>
        <span className="text-base font-semibold tracking-tight text-white">
          Nuncius
        </span>
      </div>
      <nav
        className="flex-1 space-y-1 p-2"
        aria-label={t("admin.mainNav")}
      >
        <a
          href="#"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LayoutDashboard className="size-4" />
          {t("admin.overview")}
        </a>
        <a
          href="#projects"
          className="flex items-center gap-2.5 rounded-md bg-violet-500/15 px-2.5 py-2 text-sm font-medium text-violet-300"
        >
          <Building2 className="size-4" />
          {t("admin.companies")}
          <span className="ml-auto rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] text-violet-300">
            {projects.length}
          </span>
        </a>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={() => {
            setMobileNavOpen(false);
            setSettingsOpen(true);
          }}
        >
          <Settings className="size-4" />
          {t("admin.settings")}
        </button>
        <Link
          href="/admin/observability"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={() => setMobileNavOpen(false)}
        >
          <Activity className="size-4" />
          {t("admin.observability")}
        </Link>
      </nav>
      <div className="border-t border-slate-800 p-2">
        <a
          href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <CircleHelp className="size-4" />
          {t("admin.howToConfigure")}
          <ExternalLink className="ml-auto size-3" />
        </a>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col bg-slate-950 lg:flex">
        {navigation}
      </aside>
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/40"
            aria-label={t("admin.closeMenu")}
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-slate-950">
            {navigation}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-5 lg:px-6">
          <Button
            size="icon"
            variant="ghost"
            className="mr-2 lg:hidden"
            aria-label={t("admin.openMenu")}
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
            Workspace
            <span className="text-slate-300">/</span>
            <span className="font-medium text-slate-800">
              {t("admin.companies")}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              className="hidden max-w-52 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 sm:block"
              value={organizationId ?? ""}
              onChange={(event) => {
                const selected = organizations.find((item) => item.id === event.target.value);
                setOrganizationId(event.target.value);
                if (selected) setOrganizationRole(selected.role);
              }}
              aria-label="Organização ativa"
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} · {organization.role}
                </option>
              ))}
            </select>
            <span className="hidden max-w-52 truncate text-sm text-slate-500 md:block">
              {adminEmail}
            </span>
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">{t("admin.logout")}</span>
              </Button>
            </form>
          </div>
        </header>

        <main id="projects" className="mx-auto max-w-7xl px-4 py-6 sm:px-5 lg:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-violet-600">
                {t("admin.serviceHub")}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {t("admin.companies")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {t("admin.description")}
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
              {t("admin.newCompany")}
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder={t("admin.searchCompanies")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t("admin.searchCompanies")}
              />
            </div>
            <span className="hidden text-sm text-slate-500 sm:block">
              {projects.length}{" "}
              {projects.length === 1
                ? t("admin.company")
                : t("admin.companiesPlural")}
            </span>
          </div>

          {pageError ? (
            <div
              className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center"
              role="alert"
            >
              <div>
                <p className="font-medium">
                  {t("admin.connectionAttention")}
                </p>
                <p className="mt-1 text-amber-800">{pageError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadProjects}>
                {t("common.tryAgain")}
              </Button>
            </div>
          ) : null}

          {loading ? (
            <div className="grid min-h-72 place-items-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <LoaderCircle className="size-4 animate-spin text-violet-600" />
                {t("admin.loadingProjects")}
              </div>
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  canEdit={["owner", "admin", "editor"].includes(organizationRole)}
                  onEdit={() => {
                    setActionError(null);
                    setModalProject(project);
                  }}
                  onDelete={() => {
                    setActionError(null);
                    setDeleteProject(project);
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="mt-5 grid min-h-64 place-items-center border-dashed p-6 text-center shadow-none">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-xl bg-violet-50 text-violet-600">
                  <Building2 className="size-5" />
                </div>
                <h2 className="mt-4 font-semibold text-slate-900">
                  {query ? t("admin.noCompany") : t("admin.firstCompany")}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  {query
                    ? t("admin.searchAnother")
                    : t("admin.firstCompanyDescription")}
                </p>
                {!query ? (
                  <Button className="mt-5" onClick={() => setModalProject(null)}>
                    <Plus className="size-4" />
                    {t("admin.createCompany")}
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
      {settingsOpen ? (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      ) : null}
    </div>
  );
}
