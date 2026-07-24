"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Bot,
  Check,
  CircleHelp,
  Copy,
  Headphones,
  LoaderCircle,
  MessageCircle,
  MessagesSquare,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SNIPPET_ICONS,
  SNIPPET_POSITIONS,
  SNIPPET_THEMES,
  type Project,
  type Snippet,
  type SnippetIcon,
  type SnippetInput,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS = {
  "message-circle": MessageCircle,
  "messages-square": MessagesSquare,
  headphones: Headphones,
  bot: Bot,
  "circle-help": CircleHelp,
};

const ICON_LABELS: Record<SnippetIcon, string> = {
  "message-circle": "Mensagem",
  "messages-square": "Conversas",
  headphones: "Atendimento",
  bot: "Robô",
  "circle-help": "Ajuda",
};

const THEME_LABELS = {
  light: "Claro",
  dark: "Escuro",
  system: "Automático",
  attribute: "Via data-theme",
};

const POSITION_LABELS = {
  "bottom-right": "Inferior direito",
  "bottom-left": "Inferior esquerdo",
  "top-right": "Superior direito",
  "top-left": "Superior esquerdo",
};

const DEFAULT_INPUT: SnippetInput = {
  name: "Novo snippet",
  launcherIcon: "message-circle",
  primaryColor: "#6D46E8",
  themeMode: "system",
  position: "bottom-right",
};

function toInput(snippet: Snippet): SnippetInput {
  return {
    name: snippet.name,
    launcherIcon: snippet.launcher_icon,
    primaryColor: snippet.primary_color,
    themeMode: snippet.theme_mode,
    position: snippet.position,
  };
}

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

function SnippetPreview({ form }: { form: SnippetInput }) {
  const Icon = ICONS[form.launcherIcon];
  const dark = form.themeMode === "dark";
  const horizontal = form.position.endsWith("right") ? "right-4" : "left-4";
  const vertical = form.position.startsWith("top") ? "top-4" : "bottom-4";

  return (
    <div
      className={cn(
        "relative h-48 overflow-hidden rounded-xl border",
        dark
          ? "border-slate-700 bg-slate-950"
          : "border-slate-200 bg-slate-100",
      )}
    >
      <div
        className={cn(
          "absolute h-24 w-40 overflow-hidden rounded-xl border shadow-xl",
          horizontal,
          form.position.startsWith("top") ? "top-16" : "bottom-16",
          dark
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white",
        )}
      >
        <div
          className="h-8"
          style={{ backgroundColor: form.primaryColor }}
        />
        <div className="space-y-2 p-3">
          <div
            className={cn(
              "h-2 w-24 rounded",
              dark ? "bg-slate-700" : "bg-slate-200",
            )}
          />
          <div
            className="ml-auto h-4 w-16 rounded"
            style={{ backgroundColor: form.primaryColor }}
          />
        </div>
      </div>
      <div
        className={cn(
          "absolute grid size-12 place-items-center rounded-2xl text-white shadow-lg",
          horizontal,
          vertical,
        )}
        style={{ backgroundColor: form.primaryColor }}
      >
        <Icon className="size-5" />
      </div>
    </div>
  );
}

export function SnippetManager({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SnippetInput>(DEFAULT_INPUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  const selected =
    snippets.find((snippet) => snippet.id === selectedId) ?? null;

  const loadSnippets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson<{ snippets: Snippet[] }>(
        `/api/projects/${project.id}/snippets`,
      );
      setSnippets(data.snippets);
      const first = data.snippets[0] ?? null;
      setSelectedId(first?.id ?? null);
      setForm(first ? toInput(first) : DEFAULT_INPUT);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar os snippets.",
      );
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setOrigin(window.location.origin);
      void loadSnippets();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadSnippets]);

  function selectSnippet(snippet: Snippet) {
    setSelectedId(snippet.id);
    setForm(toInput(snippet));
    setError(null);
    setCopied(false);
  }

  function startCreating() {
    setSelectedId(null);
    setForm({
      ...DEFAULT_INPUT,
      name: `Snippet ${snippets.length + 1}`,
    });
    setError(null);
    setCopied(false);
  }

  async function saveSnippet(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const data = await requestJson<{ snippet: Snippet }>(
        selected
          ? `/api/snippets/${selected.id}`
          : `/api/projects/${project.id}/snippets`,
        {
          method: selected ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      setSnippets((current) =>
        selected
          ? current.map((item) =>
              item.id === data.snippet.id ? data.snippet : item,
            )
          : [...current, data.snippet],
      );
      setSelectedId(data.snippet.id);
      setForm(toInput(data.snippet));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar o snippet.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function duplicateSelected() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const data = await requestJson<{ snippet: Snippet }>(
        `/api/snippets/${selected.id}/duplicate`,
        { method: "POST" },
      );
      setSnippets((current) => [...current, data.snippet]);
      setSelectedId(data.snippet.id);
      setForm(toInput(data.snippet));
    } catch (duplicateError) {
      setError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Não foi possível duplicar o snippet.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!window.confirm(`Excluir “${selected.name}”?`)) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/snippets/${selected.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível excluir o snippet.");
      }
      const remaining = snippets.filter((item) => item.id !== selected.id);
      setSnippets(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setForm(remaining[0] ? toInput(remaining[0]) : DEFAULT_INPUT);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível excluir o snippet.",
      );
    } finally {
      setSaving(false);
    }
  }

  const code = selected
    ? `<script src="${origin || "https://seu-dominio.com"}/widget.js" data-snippet-id="${selected.id}"${selected.theme_mode === "attribute" ? ' data-theme="light"' : ""} defer></script>`
    : "";

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/35 p-3 backdrop-blur-[2px] sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="mx-auto flex h-full max-h-[900px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="snippet-manager-title"
      >
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="snippet-manager-title"
              className="truncate text-xl font-semibold tracking-tight"
            >
              Snippets de {project.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cada código pode ter aparência e posição próprias.
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
        </header>

        {loading ? (
          <div className="grid flex-1 place-items-center text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <LoaderCircle className="size-4 animate-spin text-violet-600" />
              Carregando snippets...
            </span>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 md:grid-cols-[250px_1fr]">
            <aside className="border-b border-slate-200 bg-slate-50 p-3 md:overflow-y-auto md:border-b-0 md:border-r">
              <Button className="w-full" size="sm" onClick={startCreating}>
                <Plus className="size-4" />
                Novo snippet
              </Button>
              <div className="mt-3 grid gap-1 sm:grid-cols-2 md:grid-cols-1">
                {snippets.map((snippet) => {
                  const Icon = ICONS[snippet.launcher_icon];
                  return (
                    <button
                      key={snippet.id}
                      className={cn(
                        "flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        selectedId === snippet.id
                          ? "bg-white font-medium text-violet-700 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-600 hover:bg-white",
                      )}
                      onClick={() => selectSnippet(snippet)}
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                        style={{ backgroundColor: snippet.primary_color }}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="truncate">{snippet.name}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <form
              className="min-h-0 overflow-y-auto p-5 sm:p-6"
              onSubmit={saveSnippet}
            >
              <div className="mx-auto max-w-3xl">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {selected ? "Configurar snippet" : "Criar snippet"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      As alterações afetam somente este código.
                    </p>
                  </div>
                  {selected ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={duplicateSelected}
                        disabled={saving}
                      >
                        <Copy className="size-4" />
                        Duplicar
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        aria-label="Excluir snippet"
                        onClick={deleteSelected}
                        disabled={saving || snippets.length <= 1}
                        title={
                          snippets.length <= 1
                            ? "Cada empresa precisa ter ao menos um snippet"
                            : "Excluir snippet"
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="snippet-name">Nome</Label>
                      <Input
                        id="snippet-name"
                        value={form.name}
                        minLength={2}
                        maxLength={80}
                        required
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">
                        Ícone do botão
                      </legend>
                      <div className="grid grid-cols-5 gap-2">
                        {SNIPPET_ICONS.map((icon) => {
                          const Icon = ICONS[icon];
                          return (
                            <button
                              key={icon}
                              type="button"
                              className={cn(
                                "grid h-12 place-items-center rounded-lg border bg-white transition-colors",
                                form.launcherIcon === icon
                                  ? "border-violet-500 text-violet-700 ring-2 ring-violet-100"
                                  : "border-slate-200 text-slate-500 hover:border-slate-300",
                              )}
                              aria-label={ICON_LABELS[icon]}
                              title={ICON_LABELS[icon]}
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  launcherIcon: icon,
                                }))
                              }
                            >
                              <Icon className="size-5" />
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Cor primária</Label>
                      <div className="flex gap-2">
                        <input
                          id="primary-color"
                          type="color"
                          className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                          value={form.primaryColor}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              primaryColor: event.target.value.toUpperCase(),
                            }))
                          }
                        />
                        <Input
                          value={form.primaryColor}
                          pattern="^#[0-9A-Fa-f]{6}$"
                          maxLength={7}
                          required
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              primaryColor: event.target.value.toUpperCase(),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="snippet-theme">Tema</Label>
                      <select
                        id="snippet-theme"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        value={form.themeMode}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            themeMode: event.target
                              .value as SnippetInput["themeMode"],
                          }))
                        }
                      >
                        {SNIPPET_THEMES.map((theme) => (
                          <option key={theme} value={theme}>
                            {THEME_LABELS[theme]}
                          </option>
                        ))}
                      </select>
                      {form.themeMode === "attribute" ? (
                        <p className="text-xs leading-5 text-slate-500">
                          Use <code>data-theme=&quot;light&quot;</code>,{" "}
                          <code>dark</code> ou <code>system</code> no script.
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="snippet-position">Posição</Label>
                      <select
                        id="snippet-position"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                        value={form.position}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            position: event.target
                              .value as SnippetInput["position"],
                          }))
                        }
                      >
                        {SNIPPET_POSITIONS.map((position) => (
                          <option key={position} value={position}>
                            {POSITION_LABELS[position]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Pré-visualização</Label>
                    <div className="mt-2">
                      <SnippetPreview form={form} />
                    </div>
                    {selected ? (
                      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">
                            Código de incorporação
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyCode}
                          >
                            {copied ? (
                              <Check className="size-4 text-emerald-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                            {copied ? "Copiado" : "Copiar"}
                          </Button>
                        </div>
                        <code className="mt-3 block break-all font-mono text-[11px] leading-5 text-slate-600">
                          {code}
                        </code>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs leading-5 text-slate-500">
                        Salve o snippet para gerar o código de incorporação.
                      </p>
                    )}
                  </div>
                </div>

                {error ? (
                  <p
                    className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : null}
                    {selected ? "Salvar alterações" : "Criar snippet"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
