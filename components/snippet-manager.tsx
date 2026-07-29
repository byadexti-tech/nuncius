"use client";

import Image from "next/image";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Copy,
  Crown,
  ExternalLink,
  Headphones,
  ImageIcon,
  LoaderCircle,
  MessageCircle,
  MessagesSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n, type Locale } from "@/lib/i18n";
import {
  SNIPPET_ICONS,
  SNIPPET_FONTS,
  SNIPPET_POSITIONS,
  SNIPPET_THEMES,
  type OrganizationRole,
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

const TABS = [
  ["overview", "Visão geral"],
  ["appearance", "Aparência"],
  ["behavior", "Comportamento"],
  ["integrations", "Integrações"],
  ["security", "Segurança"],
  ["installation", "Instalação"],
] as const;

type TabSlug = (typeof TABS)[number][0];
type SaveStatus = "idle" | "saving" | "saved" | "error";
type AppearanceSection = "launcher" | "position" | "typography" | "colors";

const DEFAULT_INPUT: SnippetInput = {
  name: "Novo snippet",
  launcherType: "icon",
  launcherIcon: "message-circle",
  launcherImage: null,
  primaryColor: "#6D46E8",
  themeMode: "system",
  appearanceCustomizationsEnabled: false,
  lightBackgroundColor: "#FFFFFF",
  lightTextColor: "#172033",
  darkBackgroundColor: "#151823",
  darkTextColor: "#F4F5F8",
  lightPrimaryColor: "#6D46E8",
  lightPrimaryTextColor: "#FFFFFF",
  darkPrimaryColor: "#6D46E8",
  darkPrimaryTextColor: "#FFFFFF",
  fontFamily: "Inter",
  position: "bottom-right",
  autoStartEnabled: false,
  autoStartMessage: "Olá",
  isActive: false,
  originPolicy: "allowlist",
  allowedOrigins: [],
};

const ICON_LABELS: Record<SnippetIcon, string> = {
  "message-circle": "Mensagem",
  "messages-square": "Conversas",
  headphones: "Atendimento",
  bot: "Assistente",
  "circle-help": "Ajuda",
};

const THEME_LABELS: Record<SnippetInput["themeMode"], string> = {
  light: "Claro",
  dark: "Escuro",
  system: "Seguir o dispositivo",
  attribute: "Atributo do script",
};

const POSITION_LABELS: Record<SnippetInput["position"], string> = {
  "bottom-right": "Inferior direito",
  "bottom-left": "Inferior esquerdo",
  "top-right": "Superior direito",
  "top-left": "Superior esquerdo",
};

const POSITION_ICON_ROTATIONS: Record<SnippetInput["position"], string> = {
  "bottom-right": "-rotate-45",
  "bottom-left": "rotate-45",
  "top-right": "-rotate-[135deg]",
  "top-left": "rotate-[135deg]",
};

function isTabSlug(value: string | null): value is TabSlug {
  return TABS.some(([slug]) => slug === value);
}

function toInput(snippet: Snippet): SnippetInput {
  return {
    name: snippet.name,
    launcherType: snippet.launcher_type,
    launcherIcon: snippet.launcher_icon,
    launcherImage: snippet.launcher_image,
    primaryColor: snippet.primary_color,
    themeMode: snippet.theme_mode,
    appearanceCustomizationsEnabled: snippet.appearance_customizations_enabled,
    lightBackgroundColor: snippet.light_background_color,
    lightTextColor: snippet.light_text_color,
    darkBackgroundColor: snippet.dark_background_color,
    darkTextColor: snippet.dark_text_color,
    lightPrimaryColor: snippet.light_primary_color,
    lightPrimaryTextColor: snippet.light_primary_text_color,
    darkPrimaryColor: snippet.dark_primary_color,
    darkPrimaryTextColor: snippet.dark_primary_text_color,
    fontFamily: snippet.font_family,
    position: snippet.position,
    autoStartEnabled: snippet.auto_start_enabled,
    autoStartMessage: snippet.auto_start_message,
    isActive: snippet.is_active,
    originPolicy: snippet.origin_policy,
    allowedOrigins: snippet.allowed_origins,
  };
}

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

const MAX_IMAGE_FILE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 4096;
const OUTPUT_IMAGE_SIZE = 256;

async function prepareLauncherImage(file: File): Promise<string> {
  if (!["image/png", "image/webp"].includes(file.type)) {
    throw new Error("Envie uma imagem PNG ou WebP.");
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      image.src = objectUrl;
    });

    if (
      image.naturalWidth !== image.naturalHeight ||
      image.naturalWidth < 1 ||
      image.naturalWidth > MAX_IMAGE_DIMENSION
    ) {
      throw new Error("Use uma imagem quadrada de até 4096 × 4096 px.");
    }

    const size = Math.min(image.naturalWidth, OUTPUT_IMAGE_SIZE);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Não foi possível processar a imagem.");

    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    let hasTransparency = false;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 255) {
        hasTransparency = true;
        break;
      }
    }
    if (!hasTransparency) {
      throw new Error("A imagem precisa ter fundo transparente.");
    }

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function AppearanceAccordionItem({
  title,
  description,
  isOpen,
  onToggle,
  children,
  className,
}: {
  title: string;
  description: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel className={className}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 text-left"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>
          <span className="block text-base font-semibold text-slate-950">{title}</span>
          <span className="mt-1 block max-w-2xl text-sm leading-6 text-slate-500">{description}</span>
        </span>
        <ChevronDown className={cn("mt-1 size-5 shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen ? <div className="accordion-content-enter mt-6">{children}</div> : null}
    </Panel>
  );
}

function ColorField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <Input
          value={value}
          pattern="^#[0-9A-Fa-f]{6}$"
          maxLength={7}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      </div>
    </div>
  );
}

function FontPicker({
  value,
  disabled,
  onChange,
  customFontsEnabled = false,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  customFontsEnabled?: boolean;
}) {
  const isSuggestedFont = SNIPPET_FONTS.includes(
    value as (typeof SNIPPET_FONTS)[number],
  );
  const [showCustom, setShowCustom] = useState(!isSuggestedFont);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1 space-y-2">
          <Label htmlFor="snippet-font">Fonte</Label>
          <select
            id="snippet-font"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
            value={isSuggestedFont ? value : "__custom__"}
            disabled={disabled}
            onChange={(event) => {
              if (event.target.value === "__custom__") {
                setShowCustom(true);
                return;
              }
              setShowCustom(false);
              onChange(event.target.value);
            }}
          >
            {SNIPPET_FONTS.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
            <option value="__custom__" disabled={!customFontsEnabled}>
              Fonte personalizada — Premium
            </option>
          </select>
        </div>
        <span
          className="group relative inline-flex"
          tabIndex={customFontsEnabled ? -1 : 0}
          aria-describedby={
            customFontsEnabled ? undefined : "custom-font-premium-tooltip"
          }
        >
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !customFontsEnabled}
            className={cn(!customFontsEnabled && "cursor-not-allowed")}
            onClick={() => setShowCustom(true)}
          >
            Usar fonte personalizada
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              <Crown className="size-3" />
              Premium
            </span>
          </Button>
          {!customFontsEnabled ? (
            <span
              id="custom-font-premium-tooltip"
              role="tooltip"
              className="pointer-events-none absolute bottom-full right-0 z-30 mb-2 w-56 translate-y-1 rounded-lg bg-slate-950 px-3 py-2 text-center text-xs leading-5 text-white opacity-0 shadow-xl transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
            >
              Faça upgrade para usar uma fonte personalizada.
            </span>
          ) : null}
        </span>
      </div>
      {showCustom ? (
        <div className="space-y-2">
          <Label htmlFor="custom-font">Nome no Google Fonts</Label>
          <Input
            id="custom-font"
            value={value}
            maxLength={80}
            disabled={disabled || !customFontsEnabled}
            placeholder="Ex.: Playfair Display"
            onChange={(event) => onChange(event.target.value)}
          />
          <p className="text-xs text-slate-500">Aceita qualquer família publicada no Google Fonts. Use o nome exato da fonte.</p>
        </div>
      ) : null}
    </div>
  );
}

function SnippetPreview({ form }: { form: SnippetInput }) {
  const Icon = ICONS[form.launcherIcon];
  const image =
    form.launcherType === "image" && form.launcherImage
      ? form.launcherImage
      : null;
  const dark = form.themeMode === "dark";
  const customAppearance = form.appearanceCustomizationsEnabled;
  const surface = customAppearance
    ? dark
      ? form.darkBackgroundColor
      : form.lightBackgroundColor
    : undefined;
  const textColor = customAppearance
    ? dark
      ? form.darkTextColor
      : form.lightTextColor
    : undefined;
  const buttonColor = customAppearance
    ? dark ? form.darkPrimaryColor : form.lightPrimaryColor
    : form.primaryColor;
  const buttonTextColor = customAppearance
    ? dark ? form.darkPrimaryTextColor : form.lightPrimaryTextColor
    : "#FFFFFF";
  const horizontal = form.position.endsWith("right") ? "right-5" : "left-5";
  const vertical = form.position.startsWith("top") ? "top-5" : "bottom-5";

  return (
    <div
      className={cn(
        "relative h-[420px] overflow-hidden rounded-2xl border",
        dark
          ? "border-slate-700 bg-[radial-gradient(circle_at_top,#253047,#0f172a_70%)]"
          : "border-slate-200 bg-[radial-gradient(circle_at_top,#ffffff,#eef2ff_70%)]",
      )}
      style={{ fontFamily: customAppearance ? form.fontFamily : undefined }}
    >
      <div className="absolute left-5 right-5 top-5 flex items-center gap-2">
        <span className="size-2 rounded-full bg-red-400" />
        <span className="size-2 rounded-full bg-amber-400" />
        <span className="size-2 rounded-full bg-emerald-400" />
        <span
          className={cn(
            "ml-2 h-2.5 w-32 rounded-full",
            dark ? "bg-slate-700" : "bg-slate-200",
          )}
        />
      </div>
      <div
        className={cn(
          "absolute h-44 w-64 overflow-hidden rounded-2xl border shadow-2xl",
          horizontal,
          form.position.startsWith("top") ? "top-24" : "bottom-24",
          dark
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white",
        )}
      >
        <div
          className="flex h-12 items-center px-4 text-xs font-semibold text-white"
          style={{ backgroundColor: buttonColor, color: buttonTextColor }}
        >
          Como podemos ajudar?
        </div>
        <div className="space-y-3 p-4" style={{ backgroundColor: surface, color: textColor }}>
          <div
            className={cn(
              "h-3 w-3/4 rounded-full",
              dark ? "bg-slate-700" : "bg-slate-200",
            )}
          />
          <div
            className={cn(
              "h-3 w-1/2 rounded-full",
              dark ? "bg-slate-700" : "bg-slate-200",
            )}
          />
          <div
            className="ml-auto h-8 w-28 rounded-xl opacity-90"
            style={{ backgroundColor: buttonColor }}
          />
        </div>
      </div>
      <div
        className={cn(
          "absolute grid size-14 place-items-center rounded-2xl text-white shadow-xl",
          horizontal,
          vertical,
        )}
        style={{ backgroundColor: buttonColor, color: buttonTextColor }}
      >
        {image ? (
          <Image
            src={image}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="size-10 object-contain"
          />
        ) : (
          <Icon className="size-6" />
        )}
      </div>
    </div>
  );
}

export function SnippetManager({
  project,
  role,
  initialSnippets,
  initialSnippetId,
  initialTab,
}: {
  project: Project;
  role: OrganizationRole;
  initialSnippets: Snippet[];
  initialSnippetId?: string;
  initialTab?: string;
}) {
  const { locale } = useI18n();
  const canEdit = ["owner", "admin", "editor"].includes(role);
  const canDelete = ["owner", "admin"].includes(role);

  const initialSelected =
    initialSnippets.find((snippet) => snippet.id === initialSnippetId) ??
    initialSnippets[0] ??
    null;
  const normalizedInitialTab = initialTab ?? null;
  const [activeTab, setActiveTab] = useState<TabSlug>(
    isTabSlug(normalizedInitialTab) ? normalizedInitialTab : "overview",
  );
  const [snippets, setSnippets] = useState<Snippet[]>(initialSnippets);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelected?.id ?? null,
  );
  const [form, setForm] = useState<SnippetInput>(
    initialSelected ? toInput(initialSelected) : DEFAULT_INPUT,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [processingImage, setProcessingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );
  const [webhookUrl, setWebhookUrl] = useState(project.webhook_url);
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(
    null,
  );
  const [openAppearanceSection, setOpenAppearanceSection] =
    useState<AppearanceSection>("launcher");

  const selected =
    snippets.find((snippet) => snippet.id === selectedId) ?? null;
  const dirty = useMemo(
    () =>
      selected
        ? JSON.stringify(form) !== JSON.stringify(toInput(selected))
        : true,
    [form, selected],
  );
  const saving = saveStatus === "saving";

  function updateUrl(snippetId: string | null, tab: TabSlug) {
    const params = new URLSearchParams(window.location.search);
    if (snippetId) params.set("snippet", snippetId);
    else params.delete("snippet");
    params.set("tab", tab);
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }

  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);

  function changeTab(tab: TabSlug) {
    setActiveTab(tab);
    updateUrl(selectedId, tab);
    setError(null);
  }

  function selectSnippet(snippet: Snippet) {
    if (
      dirty &&
      !window.confirm(
        "Há alterações não salvas. Deseja descartá-las e trocar de snippet?",
      )
    ) {
      return;
    }
    setSelectedId(snippet.id);
    setForm(toInput(snippet));
    setSaveStatus("idle");
    setError(null);
    setCopied(false);
    updateUrl(snippet.id, activeTab);
  }

  function startCreating() {
    if (
      dirty &&
      !window.confirm(
        "Há alterações não salvas. Deseja descartá-las e criar outro snippet?",
      )
    ) {
      return;
    }
    const nextForm = {
      ...DEFAULT_INPUT,
      name: `Novo snippet ${snippets.length + 1}`,
    };
    setSelectedId(null);
    setForm(nextForm);
    setSaveStatus("idle");
    setError(null);
    setCopied(false);
    updateUrl(null, "overview");
  }

  async function selectLauncherImage(file: File | undefined) {
    if (!file || !canEdit) return;
    setProcessingImage(true);
    setError(null);
    try {
      const launcherImage = await prepareLauncherImage(file);
      setForm((current) => ({
        ...current,
        launcherType: "image",
        launcherImage,
      }));
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Não foi possível processar a imagem.",
      );
    } finally {
      setProcessingImage(false);
    }
  }

  async function saveSnippet(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    setSaveStatus("saving");
    setError(null);
    try {
      const data = await requestJson<{ snippet: Snippet }>(
        selected
          ? `/api/snippets/${selected.id}`
          : `/api/projects/${project.id}/snippets`,
        locale,
        "Não foi possível salvar o snippet.",
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
      setSaveStatus("saved");
      updateUrl(data.snippet.id, activeTab);
      window.setTimeout(() => setSaveStatus("idle"), 1800);
    } catch (saveError) {
      setSaveStatus("error");
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar o snippet.",
      );
    }
  }

  async function duplicateSelected() {
    if (!selected || !canEdit) return;
    setSaveStatus("saving");
    setError(null);
    try {
      const data = await requestJson<{ snippet: Snippet }>(
        `/api/snippets/${selected.id}/duplicate`,
        locale,
        "Não foi possível duplicar o snippet.",
        { method: "POST" },
      );
      setSnippets((current) => [...current, data.snippet]);
      setSelectedId(data.snippet.id);
      setForm(toInput(data.snippet));
      setSaveStatus("saved");
      updateUrl(data.snippet.id, "overview");
      window.setTimeout(() => setSaveStatus("idle"), 1800);
    } catch (duplicateError) {
      setSaveStatus("error");
      setError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "Não foi possível duplicar o snippet.",
      );
    }
  }

  async function deleteSelected() {
    if (!selected || !canDelete) return;
    if (
      !window.confirm(
        `Excluir “${selected.name}”? Esta ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    setSaveStatus("saving");
    setError(null);
    try {
      const response = await fetch(`/api/snippets/${selected.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível excluir o snippet.");
      }

      const remaining = snippets.filter((item) => item.id !== selected.id);
      const next = remaining[0] ?? null;
      setSnippets(remaining);
      setSelectedId(next?.id ?? null);
      setForm(next ? toInput(next) : DEFAULT_INPUT);
      setSaveStatus("idle");
      updateUrl(next?.id ?? null, "overview");
    } catch (deleteError) {
      setSaveStatus("error");
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível excluir o snippet.",
      );
    }
  }

  const embedCode = selected
    ? `<script src="${origin || "https://seu-dominio.com"}/widget.js" data-snippet-id="${selected.id}"${form.themeMode === "attribute" ? ' data-theme="light"' : ""} defer></script>`
    : "";

  async function copyCode() {
    if (!embedCode) return;
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function saveIntegration(testOnly = false) {
    if (!canEdit) return;
    setSaveStatus("saving");
    setIntegrationMessage(null);
    try {
      const response = await fetch(
        `/api/projects/${project.id}/integration`,
        testOnly
          ? { method: "POST" }
          : {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ webhookUrl }),
            },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        status?: number;
        responsePreview?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível concluir a operação.");
      }
      setIntegrationMessage(
        testOnly
          ? `Conexão concluída com HTTP ${data.status}.${data.responsePreview ? ` Resposta: ${data.responsePreview}` : ""}`
          : "Webhook salvo com sucesso.",
      );
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1800);
    } catch (integrationError) {
      setSaveStatus("error");
      setIntegrationMessage(
        integrationError instanceof Error
          ? integrationError.message
          : "Não foi possível testar o webhook.",
      );
    }
  }

  function renderOverview() {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <Panel>
          <SectionHeading
            title="Informações do snippet"
            description="Identifique este código no painel. O nome não aparece para os visitantes."
          />
          <div className="space-y-2">
            <Label htmlFor="snippet-name">Nome</Label>
            <Input
              id="snippet-name"
              value={form.name}
              minLength={2}
              maxLength={80}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
            <p className="text-xs text-slate-500">
              Use um nome que indique o site ou a finalidade desta instalação.
            </p>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 className="text-sm font-semibold text-slate-900">
              Identificadores
            </h4>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Projeto
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-600">
                  {project.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Snippet
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-600">
                  {selected?.id ?? "Será gerado ao salvar"}
                </dd>
              </div>
            </dl>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <SectionHeading
              title="Estado atual"
              description="Resumo da disponibilidade desta instalação."
            />
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  form.isActive ? "bg-emerald-500" : "bg-slate-300",
                )}
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {form.isActive ? "Ativo" : "Inativo"}
                </p>
                <p className="text-xs text-slate-500">
                  {form.isActive
                    ? "O widget pode carregar nos domínios autorizados."
                    : "O widget não está disponível para visitantes."}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full"
              onClick={() => changeTab("security")}
            >
              <ShieldCheck className="size-4" />
              Revisar segurança
            </Button>
          </Panel>

          {selected && canEdit ? (
            <Panel>
              <SectionHeading
                title="Ações"
                description="Duplique a configuração ou remova esta instalação."
              />
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void duplicateSelected()}
                  disabled={saving}
                >
                  <Copy className="size-4" />
                  Duplicar snippet
                </Button>
                {canDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    onClick={() => void deleteSelected()}
                    disabled={saving || snippets.length <= 1}
                  >
                    <Trash2 className="size-4" />
                    Excluir snippet
                  </Button>
                ) : null}
              </div>
              {snippets.length <= 1 ? (
                <p className="mt-3 text-xs text-slate-500">
                  O projeto deve manter pelo menos um snippet.
                </p>
              ) : null}
            </Panel>
          ) : null}
        </div>
      </div>
    );
  }

  function renderAppearance() {
    return (
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <AppearanceAccordionItem
            title="Tipografia"
            description="Defina a fonte antes das demais escolhas de aparência."
            isOpen={openAppearanceSection === "typography"}
            onToggle={() => setOpenAppearanceSection("typography")}
            className="order-3"
          >
            <label className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <span>
                <span className="block text-sm font-semibold text-slate-900">Personalizar aparência</span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">Ative apenas nos planos que precisam de cores e tipografia próprias.</span>
              </span>
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-violet-600"
                checked={form.appearanceCustomizationsEnabled}
                disabled={!canEdit}
                onChange={(event) => setForm((current) => ({ ...current, appearanceCustomizationsEnabled: event.target.checked }))}
              />
            </label>
            {form.appearanceCustomizationsEnabled ? (
              <div className="mt-5">
                <FontPicker value={form.fontFamily} disabled={!canEdit} onChange={(fontFamily) => setForm((current) => ({ ...current, fontFamily }))} />
              </div>
            ) : null}
          </AppearanceAccordionItem>

          <AppearanceAccordionItem
            title="Botão de abertura"
            description="Escolha o formato usado para abrir o chat no site."
            isOpen={openAppearanceSection === "launcher"}
            onToggle={() => setOpenAppearanceSection("launcher")}
            className="order-1"
          >
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              {(["icon", "image"] as const).map((launcherType) => (
                <button
                  key={launcherType}
                  type="button"
                  disabled={!canEdit}
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
                    form.launcherType === launcherType
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                  onClick={() =>
                    setForm((current) => ({ ...current, launcherType }))
                  }
                >
                  {launcherType === "icon" ? (
                    <MessageCircle className="size-4" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                  {launcherType === "icon" ? "Ícone" : "Imagem"}
                </button>
              ))}
            </div>

            {form.launcherType === "icon" ? (
              <div className="mt-5">
                <Label>Ícone</Label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {SNIPPET_ICONS.map((icon) => {
                    const Icon = ICONS[icon];
                    return (
                      <button
                        key={icon}
                        type="button"
                        disabled={!canEdit}
                        className={cn(
                          "grid h-14 place-items-center rounded-xl border bg-white transition-colors",
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
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-200/70">
                    {form.launcherImage ? (
                      <Image
                        src={form.launcherImage}
                        alt="Imagem selecionada"
                        width={48}
                        height={48}
                        unoptimized
                        className="size-12 object-contain"
                      />
                    ) : (
                      <ImageIcon className="size-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <label
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm",
                        canEdit ? "cursor-pointer hover:bg-slate-50" : "opacity-60",
                      )}
                    >
                      {processingImage ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {form.launcherImage ? "Trocar imagem" : "Enviar imagem"}
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/png,image/webp"
                        disabled={!canEdit || processingImage}
                        onChange={(event) => {
                          void selectLauncherImage(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      PNG ou WebP transparente e quadrado, até 2 MB.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </AppearanceAccordionItem>

          <AppearanceAccordionItem
            title="Cores e tema"
            description="Configure separadamente os visuais claro e escuro do chat."
            isOpen={openAppearanceSection === "colors"}
            onToggle={() => setOpenAppearanceSection("colors")}
            className="order-4"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Cor principal padrão</Label>
                <div className="flex gap-2">
                  <input
                    id="primary-color"
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                    value={form.primaryColor}
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                  value={form.themeMode}
                  disabled={!canEdit}
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
              </div>
            </div>
            {form.appearanceCustomizationsEnabled ? (
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 p-4">
                  <h4 className="text-sm font-semibold text-slate-900">Light mode</h4>
                  <div className="mt-4 grid gap-4">
                    <ColorField label="Cor principal" value={form.lightPrimaryColor} disabled={!canEdit} onChange={(lightPrimaryColor) => setForm((current) => ({ ...current, lightPrimaryColor }))} />
                    <ColorField label="Texto da cor principal" value={form.lightPrimaryTextColor} disabled={!canEdit} onChange={(lightPrimaryTextColor) => setForm((current) => ({ ...current, lightPrimaryTextColor }))} />
                    <ColorField label="Fundo" value={form.lightBackgroundColor} disabled={!canEdit} onChange={(lightBackgroundColor) => setForm((current) => ({ ...current, lightBackgroundColor }))} />
                    <ColorField label="Texto" value={form.lightTextColor} disabled={!canEdit} onChange={(lightTextColor) => setForm((current) => ({ ...current, lightTextColor }))} />
                  </div>
                </section>
                <section className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <h4 className="text-sm font-semibold text-white">Dark mode</h4>
                  <div className="mt-4 grid gap-4">
                    <ColorField label="Cor principal" value={form.darkPrimaryColor} disabled={!canEdit} onChange={(darkPrimaryColor) => setForm((current) => ({ ...current, darkPrimaryColor }))} />
                    <ColorField label="Texto da cor principal" value={form.darkPrimaryTextColor} disabled={!canEdit} onChange={(darkPrimaryTextColor) => setForm((current) => ({ ...current, darkPrimaryTextColor }))} />
                    <ColorField label="Fundo" value={form.darkBackgroundColor} disabled={!canEdit} onChange={(darkBackgroundColor) => setForm((current) => ({ ...current, darkBackgroundColor }))} />
                    <ColorField label="Texto" value={form.darkTextColor} disabled={!canEdit} onChange={(darkTextColor) => setForm((current) => ({ ...current, darkTextColor }))} />
                  </div>
                </section>
              </div>
            ) : null}
          </AppearanceAccordionItem>

          <AppearanceAccordionItem
            title="Posição"
            description="Escolha o canto em que o botão e a janela aparecerão."
            isOpen={openAppearanceSection === "position"}
            onToggle={() => setOpenAppearanceSection("position")}
            className="order-2"
          >
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                aria-pressed="true"
                className="flex h-10 items-center justify-center rounded-lg bg-white text-sm font-medium text-violet-700 shadow-sm"
              >
                Fixo
              </button>
              <span
                className="group relative inline-flex"
                tabIndex={0}
                aria-describedby="floating-position-premium-tooltip"
              >
                <button
                  type="button"
                  disabled
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-slate-400"
                >
                  Flutuante
                  <Crown className="size-3.5 text-amber-500" aria-hidden="true" />
                </button>
                <span
                  id="floating-position-premium-tooltip"
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 translate-y-1 rounded-lg bg-slate-950 px-3 py-2 text-center text-xs leading-5 text-white opacity-0 shadow-xl transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
                >
                  A posição flutuante está disponível nos planos Premium.
                </span>
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {SNIPPET_POSITIONS.map((position) => {
                const label = POSITION_LABELS[position];

                return (
                  <span key={position} className="group relative inline-flex">
                    <button
                      type="button"
                      disabled={!canEdit}
                      aria-label={label}
                      aria-pressed={form.position === position}
                      className={cn(
                        "flex size-11 items-center justify-center rounded-xl border",
                        form.position === position
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                      onClick={() =>
                        setForm((current) => ({ ...current, position }))
                      }
                    >
                      <ChevronDown
                        className={cn(
                          "size-5",
                          POSITION_ICON_ROTATIONS[position],
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-40 -translate-x-1/2 translate-y-1 rounded-lg bg-slate-950 px-2 py-1 text-xs text-white opacity-0 shadow-xl transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
                    >
                      {label}
                    </span>
                  </span>
                );
              })}
            </div>
          </AppearanceAccordionItem>
        </div>

        <div className="xl:sticky xl:top-24">
          <Panel>
            <SectionHeading
              title="Pré-visualização"
              description="As alterações aparecem aqui antes de serem salvas."
            />
            <SnippetPreview form={form} />
          </Panel>
        </div>
      </div>
    );
  }

  function renderBehavior() {
    return (
      <Panel className="max-w-3xl">
        <SectionHeading
          title="Início da conversa"
          description="Defina se o n8n deve ser acionado automaticamente quando o visitante abrir o chat."
        />
        <label className="flex items-start justify-between gap-5 rounded-xl border border-slate-200 p-4">
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Saudação via webhook
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">
              Envia um evento técnico ao webhook e mostra a resposta como
              primeira mensagem.
            </span>
          </span>
          <input
            type="checkbox"
            className="mt-1 size-5 shrink-0 rounded border-slate-300 accent-violet-600"
            checked={form.autoStartEnabled}
            disabled={!canEdit}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                autoStartEnabled: event.target.checked,
              }))
            }
          />
        </label>

        <div className="mt-6 space-y-2">
          <Label htmlFor="auto-start-message">Mensagem de ativação</Label>
          <textarea
            id="auto-start-message"
            className="min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400"
            value={form.autoStartMessage}
            maxLength={4000}
            disabled={!canEdit || !form.autoStartEnabled}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                autoStartMessage: event.target.value,
              }))
            }
          />
          <p className="text-xs leading-5 text-slate-500">
            Este conteúdo é enviado como instrução técnica e não aparece
            diretamente para o visitante.
          </p>
        </div>
      </Panel>
    );
  }

  function renderIntegrations() {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <SectionHeading
            title="Webhook do n8n"
            description="Este endpoint é compartilhado por todos os snippets do projeto."
          />
          <div className="space-y-2">
            <Label htmlFor="integration-webhook">URL do webhook</Label>
            <Input
              id="integration-webhook"
              type="url"
              value={webhookUrl}
              disabled={!canEdit}
              placeholder="https://n8n.exemplo.com/webhook/..."
              onChange={(event) => {
                setWebhookUrl(event.target.value);
                setIntegrationMessage(null);
              }}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void saveIntegration(false)}
              disabled={!canEdit || saving}
            >
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Salvar webhook
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveIntegration(true)}
              disabled={!canEdit || saving}
            >
              <RefreshCw className="size-4" />
              Testar conexão
            </Button>
          </div>
          {integrationMessage ? (
            <p
              className={cn(
                "mt-5 rounded-xl border px-4 py-3 text-sm",
                saveStatus === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              )}
            >
              {integrationMessage}
            </p>
          ) : null}
        </Panel>

        <Panel>
          <SectionHeading
            title="Contrato do teste"
            description="O teste envia um POST técnico com timeout curto."
          />
          <div className="rounded-xl bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-300">
            <span className="text-violet-300">POST</span>
            <br />
            {`{`}
            <br />
            &nbsp;&nbsp;&quot;event&quot;: &quot;connection_test&quot;,
            <br />
            &nbsp;&nbsp;&quot;projectId&quot;: &quot;{project.id}&quot;
            <br />
            {`}`}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            A resposta exibida no painel é sanitizada e limitada a 500
            caracteres.
          </p>
        </Panel>
      </div>
    );
  }

  function renderSecurity() {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <SectionHeading
            title="Disponibilidade e origens"
            description="Controle se o widget pode carregar e em quais sites ele será aceito."
          />
          <label className="flex items-start justify-between gap-5 rounded-xl border border-slate-200 p-4">
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Snippet ativo
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-500">
                Quando desativado, o widget não carrega configurações nem envia
                mensagens.
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 rounded border-slate-300 accent-violet-600"
              checked={form.isActive}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
          </label>

          <fieldset className="mt-6 space-y-3">
            <legend className="text-sm font-semibold text-slate-900">
              Política de origem
            </legend>
            <label
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border p-4",
                form.originPolicy === "allowlist"
                  ? "border-violet-500 bg-violet-50"
                  : "border-slate-200",
              )}
            >
              <input
                type="radio"
                name="origin-policy"
                value="allowlist"
                checked={form.originPolicy === "allowlist"}
                disabled={!canEdit}
                onChange={() =>
                  setForm((current) => ({
                    ...current,
                    originPolicy: "allowlist",
                  }))
                }
              />
              <span>
                <span className="block text-sm font-semibold">
                  Somente origens autorizadas
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Recomendado. Aceita apenas os endereços cadastrados abaixo.
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border p-4",
                form.originPolicy === "allow_all"
                  ? "border-amber-400 bg-amber-50"
                  : "border-slate-200",
              )}
            >
              <input
                type="radio"
                name="origin-policy"
                value="allow_all"
                checked={form.originPolicy === "allow_all"}
                disabled={!canEdit}
                onChange={() =>
                  setForm((current) => ({
                    ...current,
                    originPolicy: "allow_all",
                  }))
                }
              />
              <span>
                <span className="block text-sm font-semibold">
                  Permitir qualquer origem
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Compatibilidade temporária para instalações antigas.
                </span>
              </span>
            </label>
          </fieldset>

          {form.originPolicy === "allowlist" ? (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="allowed-origins">Origens autorizadas</Label>
                <span className="text-xs text-slate-400">
                  {form.allowedOrigins.length}/20
                </span>
              </div>
              <textarea
                id="allowed-origins"
                className="min-h-36 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                disabled={!canEdit}
                value={form.allowedOrigins.join("\n")}
                placeholder={"https://www.exemplo.com\nhttps://app.exemplo.com"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    allowedOrigins: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
              />
              <p className="text-xs leading-5 text-slate-500">
                Uma origem por linha, no formato{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5">
                  https://dominio.com
                </code>
                . HTTP é aceito somente em localhost.
              </p>
            </div>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-950">
              Recomendações
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
                Cadastre o domínio de produção e os ambientes de teste.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
                Não inclua caminhos, parâmetros ou curingas.
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-500" />
                Teste a instalação antes de ativar o snippet.
              </li>
            </ul>
          </Panel>
          {form.originPolicy === "allow_all" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Modo legado ativo</p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Qualquer site pode tentar carregar este widget. Cadastre as
                    origens e altere a política assim que possível.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderInstallation() {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <SectionHeading
            title="Código de incorporação"
            description="Cole este código antes do fechamento da tag body do seu site."
          />
          {selected ? (
            <>
              <div className="relative rounded-2xl bg-slate-950 p-5 pr-14">
                <code className="block break-all font-mono text-sm leading-7 text-slate-200">
                  {embedCode}
                </code>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute right-3 top-3 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
                  onClick={() => void copyCode()}
                  aria-label="Copiar código"
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                className="mt-4"
                onClick={() => void copyCode()}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Código copiado" : "Copiar código"}
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">
                Salve o snippet para gerar o código.
              </p>
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <SectionHeading
              title="Antes de publicar"
              description="Confira estes itens para evitar uma instalação indisponível."
            />
            <ol className="space-y-4">
              {[
                [
                  "1",
                  "Configure a segurança",
                  "Cadastre a origem exata do site.",
                ],
                [
                  "2",
                  "Teste o webhook",
                  "Confirme que o n8n responde corretamente.",
                ],
                [
                  "3",
                  "Ative o snippet",
                  "A instalação inativa não aparece no site.",
                ],
              ].map(([number, title, description]) => (
                <li key={number} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    {number}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
          <a
            href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-violet-200 hover:text-violet-700"
          >
            Ver documentação de instalação
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>
    );
  }

  const tabContent: Record<TabSlug, () => ReactNode> = {
    overview: renderOverview,
    appearance: renderAppearance,
    behavior: renderBehavior,
    integrations: renderIntegrations,
    security: renderSecurity,
    installation: renderInstallation,
  };

  return (
    <form
      className="min-h-[calc(100vh-4rem)]"
      onSubmit={(event) => void saveSnippet(event)}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
                Snippets
              </h1>
              {selected ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                    form.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-200 text-slate-600",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      form.isActive ? "bg-emerald-500" : "bg-slate-400",
                    )}
                  />
                  {form.isActive ? "Ativo" : "Inativo"}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Configure as instalações do assistente de {project.name}.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <select
              aria-label="Selecionar snippet"
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 sm:w-64 sm:flex-none"
              value={selectedId ?? ""}
              onChange={(event) => {
                const next = snippets.find(
                  (item) => item.id === event.target.value,
                );
                if (next) selectSnippet(next);
              }}
            >
              {!selectedId ? <option value="">Novo snippet</option> : null}
              {snippets.map((snippet) => (
                <option key={snippet.id} value={snippet.id}>
                  {snippet.name}
                </option>
              ))}
            </select>
            {canEdit ? (
              <Button type="button" onClick={startCreating}>
                <Plus className="size-4" />
                Novo
              </Button>
            ) : null}
            {selected && canEdit ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Duplicar snippet"
                onClick={() => void duplicateSelected()}
                disabled={saving}
              >
                <Copy className="size-4" />
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="submit"
                disabled={
                  saving ||
                  processingImage ||
                  !dirty ||
                  (form.launcherType === "image" && !form.launcherImage)
                }
              >
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
                {selected ? "Salvar" : "Criar"}
              </Button>
            ) : null}
          </div>
        </header>

        {!canEdit ? (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Você possui acesso somente para leitura nesta organização.
          </div>
        ) : null}

        <nav
          className="mt-7 flex gap-1 overflow-x-auto border-b border-slate-200"
          role="tablist"
          aria-label="Configurações do snippet"
        >
          {TABS.map(([slug, label]) => (
            <button
              key={slug}
              type="button"
              role="tab"
              aria-selected={activeTab === slug}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                activeTab === slug
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-900",
              )}
              onClick={() => changeTab(slug)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="py-6">
          {tabContent[activeTab]()}

          {error ? (
            <p
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0 text-sm">
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-2 text-slate-500">
                <LoaderCircle className="size-4 animate-spin" />
                Salvando alterações...
              </span>
            ) : saveStatus === "saved" ? (
              <span className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="size-4" />
                Alterações salvas
              </span>
            ) : saveStatus === "error" ? (
              <span className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="size-4" />
                Não foi possível salvar
              </span>
            ) : dirty ? (
              <span className="text-amber-700">Alterações não salvas</span>
            ) : (
              <span className="text-slate-400">Tudo salvo</span>
            )}
          </div>
          {canEdit ? (
            <Button
              type="submit"
              disabled={
                saving ||
                processingImage ||
                !dirty ||
                (form.launcherType === "image" && !form.launcherImage)
              }
            >
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {selected ? "Salvar alterações" : "Criar snippet"}
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
