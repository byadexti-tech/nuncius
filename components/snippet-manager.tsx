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
  LayoutGrid,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  LucideCatalogIcon,
  LucideIconPicker,
} from "@/components/lucide-icon-picker";
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

function LauncherIcon({
  name,
  className,
}: {
  name: SnippetIcon;
  className?: string;
}) {
  const StaticIcon = ICONS[name as keyof typeof ICONS];
  return StaticIcon ? (
    <StaticIcon className={className} />
  ) : (
    <LucideCatalogIcon name={name} className={className} />
  );
}

const TABS = [
  ["overview", "Visão geral"],
  ["appearance", "Aparência"],
  ["behavior", "Comportamento"],
  ["integrations", "Integrações"],
  ["authentication", "Autenticação"],
  ["security", "Segurança"],
  ["installation", "Instalação"],
] as const;

type TabSlug = (typeof TABS)[number][0];
type SaveStatus = "idle" | "saving" | "saved" | "error";
type AppearanceSection =
  | "launcher"
  | "position"
  | "typography"
  | "colors"
  | "header"
  | "branding";

const DEFAULT_LOADING_MESSAGES = [
  "Pesquisando...",
  "Analisando...",
  "Pensando...",
  "Escolhendo a melhor resposta...",
];

const DEFAULT_INTRO_PHRASES = [
  { text: "Uma revolução chegou para ficar.", durationMs: 2500 },
  { text: "A IA veio para revolucionar.", durationMs: 2500 },
  {
    text: "Mais ideias. Respostas mais rápidas. Novas possibilidades.",
    durationMs: 2500,
  },
  { text: "E agora, tudo isso está ao seu alcance.", durationMs: 2500 },
];

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
  hidePoweredBy: false,
  headerTitle: "Como podemos ajudar?",
  showOnlineStatus: true,
  fontFamily: "Inter",
  position: "bottom-right",
  autoStartEnabled: false,
  autoStartMessage: "Olá",
  activationMode: "free_text",
  activationPrompt: "Escolha uma pergunta para começar",
  activationQuestions: [],
  showInputWithPredefinedQuestions: true,
  loadingMessages: DEFAULT_LOADING_MESSAGES,
  introPhrases: DEFAULT_INTRO_PHRASES,
  authEnabled: false,
  authMode: "manual",
  authTitle: "Acesse sua conta",
  authDescription: "Entre para iniciar o atendimento.",
  isActive: false,
  originPolicy: "allowlist",
  allowedOrigins: [],
};

const ICON_LABELS: Record<(typeof SNIPPET_ICONS)[number], string> = {
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

function subscribeToOrigin() {
  return () => {};
}

function getClientOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return "";
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
    hidePoweredBy: snippet.hide_powered_by,
    headerTitle: snippet.header_title,
    showOnlineStatus: snippet.show_online_status,
    fontFamily: snippet.font_family,
    position: snippet.position,
    autoStartEnabled: snippet.auto_start_enabled,
    autoStartMessage: snippet.auto_start_message,
    activationMode: snippet.activation_mode,
    activationPrompt: snippet.activation_prompt,
    activationQuestions: snippet.activation_questions,
    showInputWithPredefinedQuestions:
      snippet.show_input_with_predefined_questions,
    loadingMessages: snippet.loading_messages,
    introPhrases: snippet.intro_phrases,
    authEnabled: snippet.auth_enabled,
    authMode: snippet.auth_mode,
    authTitle: snippet.auth_title,
    authDescription: snippet.auth_description,
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
const LAUNCHER_IMAGE_TYPES = ["image/png", "image/webp", "image/svg+xml"];

function prepareSvgSource(source: string): string {
  const documentNode = new DOMParser().parseFromString(
    source,
    "image/svg+xml",
  );
  const svg = documentNode.documentElement;

  if (
    svg.localName !== "svg" ||
    documentNode.querySelector("parsererror") ||
    documentNode.querySelector(
      "script, foreignObject, iframe, object, embed, audio, video",
    )
  ) {
    throw new Error("O arquivo SVG é inválido ou contém conteúdo não permitido.");
  }

  for (const element of documentNode.querySelectorAll("*")) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const hasExternalCssReference =
        name === "style" &&
        /(?:url\s*\(|@import|expression\s*\()/i.test(value);

      if (
        name.startsWith("on") ||
        hasExternalCssReference ||
        ((name === "href" || name === "xlink:href") &&
          value !== "" &&
          !value.startsWith("#") &&
          !/^data:image\/(?:png|webp);base64,/i.test(value))
      ) {
        throw new Error(
          "O arquivo SVG contém scripts ou referências externas não permitidas.",
        );
      }
    }
  }
  for (const style of documentNode.querySelectorAll("style")) {
    if (/(?:url\s*\(|@import|expression\s*\()/i.test(style.textContent ?? "")) {
      throw new Error(
        "O arquivo SVG contém estilos com referências externas não permitidas.",
      );
    }
  }

  const viewBox = (svg.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  let width = viewBox[2];
  let height = viewBox[3];

  if (
    viewBox.length !== 4 ||
    viewBox.some((value) => !Number.isFinite(value)) ||
    width <= 0 ||
    height <= 0
  ) {
    width = Number.parseFloat(svg.getAttribute("width") ?? "");
    height = Number.parseFloat(svg.getAttribute("height") ?? "");
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new Error("O SVG precisa ter um viewBox ou dimensões válidas.");
    }
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  if (Math.abs(width - height) > Number.EPSILON * Math.max(width, height)) {
    throw new Error("Use uma imagem quadrada.");
  }

  svg.setAttribute("width", String(OUTPUT_IMAGE_SIZE));
  svg.setAttribute("height", String(OUTPUT_IMAGE_SIZE));

  return new XMLSerializer().serializeToString(documentNode);
}

async function prepareLauncherImage(file: File): Promise<string> {
  const isSvg =
    file.type === "image/svg+xml" ||
    (file.type === "" && file.name.toLowerCase().endsWith(".svg"));
  if (!LAUNCHER_IMAGE_TYPES.includes(file.type) && !isSvg) {
    throw new Error("Envie uma imagem PNG, WebP ou SVG.");
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }

  const imageSource = isSvg
    ? new Blob([prepareSvgSource(await file.text())], {
        type: "image/svg+xml",
      })
    : file;
  const objectUrl = URL.createObjectURL(imageSource);
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

const PREVIEW_COPY: Record<
  TabSlug,
  { eyebrow: string; description: string }
> = {
  overview: {
    eyebrow: "Visão do visitante",
    description: "Estado atual do widget no site.",
  },
  appearance: {
    eyebrow: "Aparência em tempo real",
    description: "Cores, posição, ícone e tipografia acompanham suas escolhas.",
  },
  behavior: {
    eyebrow: "Início da conversa",
    description: "Prévia da experiência definida nesta aba.",
  },
  integrations: {
    eyebrow: "Resposta do assistente",
    description: "Estado da conexão usada para enviar mensagens.",
  },
  authentication: {
    eyebrow: "Acesso do visitante",
    description: "Prévia da etapa de autenticação configurada.",
  },
  security: {
    eyebrow: "Disponibilidade",
    description: "Estado do widget conforme a política de segurança.",
  },
  installation: {
    eyebrow: "Widget instalado",
    description: "Resultado que aparece depois da incorporação no site.",
  },
};

function SnippetPreview({
  form,
  activeTab,
  webhookUrl,
  selected,
  isOpen,
  onOpenChange,
}: {
  form: SnippetInput;
  activeTab: TabSlug;
  webhookUrl: string;
  selected: Snippet | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  if (selected) {
    const previewCopy = PREVIEW_COPY[activeTab];
    const encodedConfig = encodeURIComponent(JSON.stringify(form));
    const srcDoc = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: #f1f5f9;
      }
    </style>
  </head>
  <body>
    <script
      src="/widget.js"
      data-snippet-id="${selected.id}"
      data-preview="true"
      data-preview-open="true"
      data-preview-tab="${activeTab}"
      data-preview-config="${encodedConfig}"
    ></script>
  </body>
</html>`;

    return (
      <Panel className="flex h-full flex-col overflow-hidden">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
              {previewCopy.eyebrow}
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-950">
              Widget real
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {previewCopy.description}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            widget.js
          </span>
        </div>
        <iframe
          key={`${selected.id}-${activeTab}-${encodedConfig}`}
          title="Widget Nuncius real"
          className="min-h-0 w-full flex-1 rounded-2xl border border-slate-200 bg-slate-100"
          sandbox="allow-forms allow-same-origin allow-scripts"
          srcDoc={srcDoc}
        />
      </Panel>
    );
  }

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
  const previewCopy = PREVIEW_COPY[activeTab];
  const questions = form.activationQuestions.filter(Boolean).slice(0, 3);
  const widgetAvailable =
    form.isActive ||
    activeTab === "appearance" ||
    activeTab === "behavior" ||
    activeTab === "authentication";

  function renderBody() {
    if (activeTab === "security" && !form.isActive) {
      return (
        <div className="grid h-full place-items-center px-7 text-center">
          <div>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <ShieldCheck className="size-5" />
            </div>
            <p className="mt-4 text-sm font-semibold">Widget inativo</p>
            <p className="mt-1 text-xs leading-5 opacity-70">
              Ative o snippet para disponibilizá-lo aos visitantes.
            </p>
          </div>
        </div>
      );
    }

    if (activeTab === "authentication" && form.authEnabled) {
      if (form.authMode === "automatic") {
        return (
          <div className="grid h-full place-items-center px-7 text-center">
            <div>
              <LoaderCircle
                className="mx-auto size-7 animate-spin"
                style={{ color: buttonColor }}
              />
              <p className="mt-4 text-sm font-semibold">Validando acesso</p>
              <p className="mt-1 text-xs leading-5 opacity-70">
                O token do site será confirmado antes de abrir a conversa.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="h-full overflow-y-auto px-5 py-6 text-center">
          <div
            className="mx-auto grid size-11 place-items-center rounded-2xl"
            style={{ backgroundColor: `${buttonColor}1f`, color: buttonColor }}
          >
            <LockKeyhole className="size-5" />
          </div>
          <p className="mt-3 text-base font-bold">
            {form.authTitle || "Acesse sua conta"}
          </p>
          <p className="mt-1 text-xs leading-5 opacity-70">
            {form.authDescription || "Entre para iniciar o atendimento."}
          </p>
          <div className="mt-4 space-y-2 text-left">
            <label className="block text-[11px] font-semibold">
              Login
              <input
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-xs outline-none"
                placeholder="seu@email.com"
                readOnly
              />
            </label>
            <label className="block text-[11px] font-semibold">
              Senha
              <input
                type="password"
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-xs outline-none"
                value="12345678"
                readOnly
              />
            </label>
            <button
              type="button"
              className="h-9 w-full rounded-xl text-xs font-bold"
              style={{ backgroundColor: buttonColor, color: buttonTextColor }}
            >
              Entrar
            </button>
          </div>
        </div>
      );
    }

    if (activeTab === "behavior" && form.activationMode === "predefined_questions") {
      return (
        <div className="flex h-full flex-col justify-end p-4">
          <p className="mb-3 text-center text-xs font-medium opacity-70">
            {form.activationPrompt || "Escolha uma pergunta para começar"}
          </p>
          <div className="space-y-2">
            {(questions.length
              ? questions
              : ["Quero conhecer o produto", "Preciso de ajuda"]).map(
              (question) => (
                <button
                  key={question}
                  type="button"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-slate-700 shadow-sm"
                >
                  {question}
                </button>
              ),
            )}
          </div>
        </div>
      );
    }

    if (activeTab === "integrations") {
      return (
        <div className="flex h-full flex-col justify-end p-4">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2.5 text-xs leading-5 text-slate-700">
            Olá! Como posso ajudar você hoje?
          </div>
          <div
            className={cn(
              "mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-medium",
              webhookUrl.trim()
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                webhookUrl.trim() ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            {webhookUrl.trim()
              ? "Webhook pronto para responder"
              : "Webhook ainda não configurado"}
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col justify-end p-4">
        {activeTab === "installation" ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            {selected ? "Código pronto para publicação" : "Salve para gerar o código"}
          </div>
        ) : null}
        {activeTab === "security" ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
            <ShieldCheck className="size-3.5" />
            {form.originPolicy === "allow_all"
              ? "Disponível em qualquer origem"
              : `${form.allowedOrigins.filter(Boolean).length} origem(ns) autorizada(s)`}
          </div>
        ) : null}
        <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2.5 text-xs leading-5 text-slate-700">
          {activeTab === "behavior" && form.autoStartEnabled
            ? form.autoStartMessage || "Olá"
            : "Olá! Como podemos ajudar?"}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
          <span className="flex-1 text-[11px] opacity-55">
            Digite sua mensagem...
          </span>
          <span
            className="grid size-7 place-items-center rounded-lg"
            style={{ backgroundColor: buttonColor, color: buttonTextColor }}
          >
            <MessageCircle className="size-3.5" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <Panel className="flex h-full flex-col overflow-hidden">
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
              {previewCopy.eyebrow}
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-950">
              Widget em tempo real
            </h2>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
              widgetAvailable
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                widgetAvailable ? "bg-emerald-500" : "bg-slate-400",
              )}
            />
            {widgetAvailable ? "Prévia ativa" : "Indisponível"}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {previewCopy.description}
        </p>
      </div>

      <div
        className={cn(
          "relative min-h-[450px] flex-1 overflow-hidden rounded-2xl border p-4",
          dark
            ? "border-slate-700 bg-slate-950"
            : "border-slate-200 bg-slate-100",
        )}
        style={{ fontFamily: customAppearance ? form.fontFamily : undefined }}
      >
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-red-400" />
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="size-2 rounded-full bg-emerald-400" />
          <span
            className={cn(
              "ml-2 h-2 w-24 rounded-full",
              dark ? "bg-slate-700" : "bg-white",
            )}
          />
        </div>

        {isOpen ? (
          <div
            className={cn(
              "absolute inset-x-4 z-10 flex flex-col overflow-hidden rounded-[22px] border shadow-2xl",
              form.position.startsWith("top")
                ? "bottom-4 top-28"
                : "bottom-20 top-12",
              dark
                ? "border-slate-700 bg-slate-900 text-slate-100"
                : "border-slate-200 bg-white text-slate-900",
            )}
            style={{ backgroundColor: surface, color: textColor }}
          >
            <div
              className="flex h-14 shrink-0 items-center px-4"
              style={{ backgroundColor: buttonColor, color: buttonTextColor }}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">
                  {form.headerTitle}
                </div>
                {form.showOnlineStatus ? (
                  <div className="mt-0.5 flex items-center gap-1 text-[9px] opacity-80">
                    <span className="size-1.5 rounded-full bg-emerald-300" />
                    Online agora
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="grid size-8 place-items-center rounded-lg hover:bg-white/10"
                aria-label="Fechar prévia do widget"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">{renderBody()}</div>
            {!form.hidePoweredBy ? (
              <div className="shrink-0 pb-2 text-center text-[9px] opacity-50">
                Powered by Nuncius
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          className={cn(
            "absolute z-20 grid size-14 place-items-center rounded-2xl shadow-xl transition-transform hover:-translate-y-0.5",
            form.position.endsWith("right") ? "right-4" : "left-4",
            form.position.startsWith("top") ? "top-12" : "bottom-4",
          )}
          style={{ backgroundColor: buttonColor, color: buttonTextColor }}
          aria-label={isOpen ? "Fechar widget" : "Abrir widget"}
          aria-expanded={isOpen}
          onClick={() => onOpenChange(!isOpen)}
        >
          {isOpen ? (
            <X className="size-5" />
          ) : image ? (
            <Image
              src={image}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="size-10 object-contain"
            />
          ) : (
            <LauncherIcon name={form.launcherIcon} className="size-6" />
          )}
        </button>
      </div>
    </Panel>
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
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    getClientOrigin,
    getServerOrigin,
  );
  const [webhookUrl, setWebhookUrl] = useState(project.webhook_url);
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(
    null,
  );
  const [openAppearanceSection, setOpenAppearanceSection] =
    useState<AppearanceSection>("launcher");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

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
          body: JSON.stringify({
            ...form,
            allowedOrigins: form.allowedOrigins
              .map((origin) => origin.trim())
              .filter(Boolean),
          }),
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
    ? `<script src="${origin || "https://seu-dominio.com"}/widget.js" data-snippet-id="${selected.id}"${form.themeMode === "attribute" ? ' data-theme="light"' : ""}${form.authEnabled && form.authMode === "automatic" ? ' data-auth-token="TOKEN_TEMPORARIO_DO_USUARIO"' : ""} defer></script>`
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
      <div className="space-y-6">
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

        <div className="grid gap-6 lg:grid-cols-2">
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
                <FontPicker
                  value={form.fontFamily}
                  disabled={!canEdit}
                  customFontsEnabled={project.is_premium}
                  onChange={(fontFamily) =>
                    setForm((current) => ({ ...current, fontFamily }))
                  }
                />
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
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
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
                  <button
                    type="button"
                    disabled={!canEdit}
                    className={cn(
                      "flex h-14 flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-white transition-colors disabled:opacity-60",
                      !(SNIPPET_ICONS as readonly string[]).includes(
                        form.launcherIcon,
                      )
                        ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-100"
                        : "border-slate-300 text-slate-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700",
                    )}
                    onClick={() => setIconPickerOpen(true)}
                  >
                    {(SNIPPET_ICONS as readonly string[]).includes(
                      form.launcherIcon,
                    ) ? (
                      <LayoutGrid className="size-5" />
                    ) : (
                      <LauncherIcon
                        name={form.launcherIcon}
                        className="size-5"
                      />
                    )}
                    <span className="text-[10px] font-medium">Ver mais</span>
                  </button>
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
                        accept="image/png,image/webp,image/svg+xml,.svg"
                        disabled={!canEdit || processingImage}
                        onChange={(event) => {
                          void selectLauncherImage(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      PNG, WebP ou SVG transparente e quadrado, até 2 MB.
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
            <div className="flex flex-wrap gap-2">
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

          <AppearanceAccordionItem
            title="Cabeçalho"
            description="Personalize o título exibido no topo do chat."
            isOpen={openAppearanceSection === "header"}
            onToggle={() => setOpenAppearanceSection("header")}
            className="order-5"
          >
            <div className="space-y-2">
              <Label htmlFor="snippet-header-title">Título</Label>
              <Input
                id="snippet-header-title"
                value={form.headerTitle}
                minLength={2}
                maxLength={80}
                disabled={!canEdit}
                placeholder="Como podemos ajudar?"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    headerTitle: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-slate-500">
                Este texto aparece para os visitantes no cabeçalho do widget.
              </p>
            </div>
            <label
              className={cn(
                "mt-5 flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4",
                canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-70",
              )}
            >
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Mostrar status online
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Exibe o ponto verde e o texto “Online agora”.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.showOnlineStatus}
                disabled={!canEdit}
                className="size-4 shrink-0 accent-violet-600"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    showOnlineStatus: event.target.checked,
                  }))
                }
              />
            </label>
          </AppearanceAccordionItem>

          <AppearanceAccordionItem
            title="Marca Nuncius"
            description="Controle a assinatura exibida no rodapé do widget."
            isOpen={openAppearanceSection === "branding"}
            onToggle={() => setOpenAppearanceSection("branding")}
            className="order-6"
          >
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700">
                  <Crown className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Projeto Premium
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    Este projeto é Premium e pode remover a assinatura do widget.
                  </span>
                </span>
              </div>
              <Button
                type="button"
                variant={form.hidePoweredBy ? "default" : "outline"}
                className="mt-4 w-full"
                aria-pressed={form.hidePoweredBy}
                disabled={!canEdit || !project.is_premium}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    hidePoweredBy: !current.hidePoweredBy,
                  }))
                }
              >
                <Check className={cn("size-4", !form.hidePoweredBy && "opacity-0")} />
                {form.hidePoweredBy
                  ? "Powered by Nuncius oculto"
                  : "Ocultar Powered by Nuncius"}
              </Button>
            </div>
          </AppearanceAccordionItem>
      </div>
    );
  }

  function renderBehavior() {
    function updateIntroPhrase(
      index: number,
      field: "text" | "durationMs",
      value: string | number,
    ) {
      setForm((current) => ({
        ...current,
        introPhrases: current.introPhrases.map((phrase, phraseIndex) =>
          phraseIndex === index ? { ...phrase, [field]: value } : phrase,
        ),
      }));
    }

    function removeIntroPhrase(index: number) {
      setForm((current) => ({
        ...current,
        introPhrases: current.introPhrases.filter(
          (_, phraseIndex) => phraseIndex !== index,
        ),
      }));
    }

    function updateActivationQuestion(index: number, value: string) {
      setForm((current) => ({
        ...current,
        activationQuestions: current.activationQuestions.map(
          (question, questionIndex) =>
            questionIndex === index ? value : question,
        ),
      }));
    }

    function removeActivationQuestion(index: number) {
      setForm((current) => ({
        ...current,
        activationQuestions: current.activationQuestions.filter(
          (_, questionIndex) => questionIndex !== index,
        ),
      }));
    }

    function updateLoadingMessage(index: number, value: string) {
      setForm((current) => ({
        ...current,
        loadingMessages: current.loadingMessages.map(
          (message, messageIndex) =>
            messageIndex === index ? value : message,
        ),
      }));
    }

    function removeLoadingMessage(index: number) {
      setForm((current) => ({
        ...current,
        loadingMessages: current.loadingMessages.filter(
          (_, messageIndex) => messageIndex !== index,
        ),
      }));
    }

    return (
      <Panel>
        <SectionHeading
          title="Apresentação inicial"
          description="Personalize as frases exibidas antes da primeira abertura do chat e o tempo de cada uma na tela."
        />
        <div className="space-y-3">
          {form.introPhrases.map((phrase, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end"
            >
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`intro-phrase-${index}`}>
                  Frase {index + 1}
                </Label>
                <Input
                  id={`intro-phrase-${index}`}
                  value={phrase.text}
                  maxLength={200}
                  disabled={!canEdit}
                  placeholder="Ex.: Uma revolução chegou para ficar."
                  onChange={(event) =>
                    updateIntroPhrase(index, "text", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`intro-duration-${index}`}>Tempo (s)</Label>
                <Input
                  id={`intro-duration-${index}`}
                  type="number"
                  min="0.5"
                  max="15"
                  step="0.1"
                  value={phrase.durationMs / 1000}
                  disabled={!canEdit}
                  onChange={(event) =>
                    updateIntroPhrase(
                      index,
                      "durationMs",
                      Math.round(Number(event.target.value) * 1000),
                    )
                  }
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0 text-slate-500 hover:text-red-600"
                aria-label={`Remover frase de apresentação ${index + 1}`}
                disabled={!canEdit || form.introPhrases.length === 1}
                onClick={() => removeIntroPhrase(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          disabled={!canEdit || form.introPhrases.length >= 10}
          onClick={() =>
            setForm((current) => ({
              ...current,
              introPhrases: [
                ...current.introPhrases,
                { text: "", durationMs: 2500 },
              ],
            }))
          }
        >
          <Plus className="size-4" />
          Adicionar frase à apresentação
        </Button>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Use de 1 a 10 frases. Cada uma pode ter até 200 caracteres e ficar
          entre 0,5 e 15 segundos na tela.
        </p>

        <div className="mt-8 border-t border-slate-200 pt-8">
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
        </div>

        <fieldset className="mt-8">
          <legend className="text-sm font-semibold text-slate-900">
            Primeira interação do visitante
          </legend>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Escolha como o visitante poderá iniciar a conversa.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                value: "free_text" as const,
                title: "Texto livre",
                description:
                  "Mantém o campo de mensagem disponível desde o início.",
              },
              {
                value: "predefined_questions" as const,
                title: "Perguntas pré-definidas",
                description:
                  "Exibe opções clicáveis para iniciar a conversa.",
              },
            ].map((option) => (
              <label
                key={option.value}
                className={cn(
                  "cursor-pointer rounded-xl border p-4 transition-colors",
                  form.activationMode === option.value
                    ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100"
                    : "border-slate-200 hover:border-slate-300",
                  !canEdit && "cursor-not-allowed opacity-70",
                )}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="activation-mode"
                    value={option.value}
                    checked={form.activationMode === option.value}
                    disabled={!canEdit}
                    className="mt-1 size-4 accent-violet-600"
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        activationMode: option.value,
                        activationQuestions:
                          option.value === "predefined_questions" &&
                          current.activationQuestions.length === 0
                            ? [""]
                            : current.activationQuestions,
                      }))
                    }
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      {option.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {option.description}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {form.activationMode === "predefined_questions" ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="space-y-2">
              <Label htmlFor="activation-prompt">Texto de apresentação</Label>
              <Input
                id="activation-prompt"
                value={form.activationPrompt}
                minLength={1}
                maxLength={200}
                disabled={!canEdit}
                placeholder="Escolha uma pergunta para começar"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    activationPrompt: event.target.value,
                  }))
                }
              />
              <p className="text-center text-sm font-semibold text-slate-800">
                {form.activationPrompt || "Texto de apresentação"}
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {form.activationQuestions.map((question, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor={`activation-question-${index}`}>
                      Pergunta {index + 1}
                    </Label>
                    <Input
                      id={`activation-question-${index}`}
                      value={question}
                      maxLength={4000}
                      disabled={!canEdit}
                      placeholder="Ex.: Quais são os planos disponíveis?"
                      onChange={(event) =>
                        updateActivationQuestion(index, event.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="mt-6 shrink-0 text-slate-500 hover:text-red-600"
                    aria-label={`Remover pergunta ${index + 1}`}
                    disabled={!canEdit}
                    onClick={() => removeActivationQuestion(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              disabled={!canEdit}
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  activationQuestions: [...current.activationQuestions, ""],
                }))
              }
            >
              <Plus className="size-4" />
              Adicionar pergunta
            </Button>
            <label
              className={cn(
                "mt-5 flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4",
                canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-70",
              )}
            >
              <span>
                <span className="block text-sm font-medium text-slate-900">
                  Exibir campo de texto
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Permite que o visitante também escreva uma pergunta livre
                  desde o início.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.showInputWithPredefinedQuestions}
                disabled={!canEdit}
                className="mt-0.5 size-4 shrink-0 accent-violet-600"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    showInputWithPredefinedQuestions: event.target.checked,
                  }))
                }
              />
            </label>
          </div>
        ) : null}

        <div className="mt-8 border-t border-slate-200 pt-8">
          <SectionHeading
            title="Mensagens durante a espera"
            description="Estas frases aparecem em sequência enquanto o assistente prepara a resposta."
          />
          <div className="space-y-3">
            {form.loadingMessages.map((message, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor={`loading-message-${index}`}>
                    Frase {index + 1}
                  </Label>
                  <Input
                    id={`loading-message-${index}`}
                    value={message}
                    maxLength={80}
                    disabled={!canEdit}
                    placeholder="Ex.: Analisando..."
                    onChange={(event) =>
                      updateLoadingMessage(index, event.target.value)
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="mt-6 shrink-0 text-slate-500 hover:text-red-600"
                  aria-label={`Remover frase ${index + 1}`}
                  disabled={!canEdit || form.loadingMessages.length === 1}
                  onClick={() => removeLoadingMessage(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            disabled={!canEdit || form.loadingMessages.length >= 10}
            onClick={() =>
              setForm((current) => ({
                ...current,
                loadingMessages: [...current.loadingMessages, ""],
              }))
            }
          >
            <Plus className="size-4" />
            Adicionar frase
          </Button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Use de 1 a 10 frases. Cada uma pode ter até 80 caracteres.
          </p>
        </div>
      </Panel>
    );
  }

  function renderIntegrations() {
    return (
      <div className="space-y-6">
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
      <div className="space-y-6">
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
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Origens autorizadas</Label>
                <span className="text-xs text-slate-400">
                  {form.allowedOrigins.length}/20
                </span>
              </div>
              {form.allowedOrigins.length > 0 ? (
                <div className="space-y-2">
                  {form.allowedOrigins.map((origin, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2"
                    >
                      <Input
                        id={`allowed-origin-${index}`}
                        type="url"
                        className="font-mono"
                        disabled={!canEdit}
                        value={origin}
                        placeholder="https://www.exemplo.com"
                        aria-label={`Origem autorizada ${index + 1}`}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            allowedOrigins: current.allowedOrigins.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? event.target.value
                                  : item,
                            ),
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        disabled={!canEdit}
                        aria-label={`Remover origem ${index + 1}`}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            allowedOrigins: current.allowedOrigins.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                  Nenhuma origem cadastrada.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={!canEdit || form.allowedOrigins.length >= 20}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    allowedOrigins: [...current.allowedOrigins, ""],
                  }))
                }
              >
                <Plus className="size-4" />
                Adicionar origem
              </Button>
              <p className="text-xs leading-5 text-slate-500">
                Informe cada origem no formato{" "}
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

  function renderAuthentication() {
    return (
      <div className="space-y-6">
        <Panel>
          <SectionHeading
            title="Autenticação do visitante"
            description="Defina se o chat deve validar o visitante no n8n antes de liberar a conversa."
          />

          <label
            className={cn(
              "flex items-start justify-between gap-5 rounded-xl border border-slate-200 p-4",
              canEdit ? "cursor-pointer" : "cursor-not-allowed opacity-70",
            )}
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Exigir autenticação
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-500">
                O widget permanece bloqueado até o webhook do n8n confirmar o
                acesso.
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 size-5 shrink-0 rounded border-slate-300 accent-violet-600"
              checked={form.authEnabled}
              disabled={!canEdit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  authEnabled: event.target.checked,
                }))
              }
            />
          </label>

          {form.authEnabled ? (
            <>
              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-slate-900">
                  Método de autenticação
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      value: "manual" as const,
                      title: "Login e senha",
                      description:
                        "Exibe um formulário dentro da janela do chat.",
                    },
                    {
                      value: "automatic" as const,
                      title: "Automático",
                      description:
                        "Valida um token fornecido pelo site sem interromper o visitante.",
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-colors",
                        form.authMode === option.value
                          ? "border-violet-400 bg-violet-50 ring-2 ring-violet-100"
                          : "border-slate-200 hover:border-slate-300",
                        !canEdit && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <span className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="auth-mode"
                          value={option.value}
                          checked={form.authMode === option.value}
                          disabled={!canEdit}
                          className="mt-1 size-4 accent-violet-600"
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              authMode: option.value,
                            }))
                          }
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">
                            {option.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {option.description}
                          </span>
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-6 grid gap-5">
                <div className="space-y-2">
                  <Label htmlFor="auth-title">Título da tela</Label>
                  <Input
                    id="auth-title"
                    value={form.authTitle}
                    minLength={2}
                    maxLength={80}
                    disabled={!canEdit}
                    placeholder="Acesse sua conta"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        authTitle: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-description">Descrição</Label>
                  <textarea
                    id="auth-description"
                    className="min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50"
                    value={form.authDescription}
                    maxLength={240}
                    disabled={!canEdit}
                    placeholder="Entre para iniciar o atendimento."
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        authDescription: event.target.value,
                      }))
                    }
                  />
                  <p className="text-right text-xs text-slate-400">
                    {form.authDescription.length}/240
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <LockKeyhole className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-950">
              Contrato com o n8n
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              O mesmo webhook do projeto receberá o evento{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                authenticate
              </code>
              .
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-300">
              <span className="text-slate-500">
                {"// resposta esperada"}
              </span>
              <br />
              {`{`}
              <br />
              &nbsp;&nbsp;&quot;authenticated&quot;: true,
              <br />
              &nbsp;&nbsp;&quot;authToken&quot;: &quot;token-opaco&quot;
              <br />
              {`}`}
            </div>
          </Panel>

          {form.authEnabled && form.authMode === "automatic" ? (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900">
              <p className="text-sm font-semibold">Token automático</p>
              <p className="mt-1 text-sm leading-6 text-blue-800">
                Gere um token temporário no servidor do site e informe-o no
                atributo{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">
                  data-auth-token
                </code>
                . Nunca coloque login e senha no HTML.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderInstallation() {
    return (
      <div className="space-y-6">
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
    authentication: renderAuthentication,
    security: renderSecurity,
    installation: renderInstallation,
  };

  return (
    <form
      className="flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden"
      onSubmit={(event) => void saveSnippet(event)}
    >
      <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-y-5 overflow-y-auto px-4 pt-6 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)] xl:grid-rows-[auto_auto_minmax(0,1fr)] xl:gap-x-8 xl:gap-y-0 xl:overflow-hidden">
        <header className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between xl:col-start-1 xl:row-start-1">
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
              {project.is_premium ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <Crown className="size-3.5" />
                  Projeto Premium
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Configure as instalações do assistente de {project.name}.
            </p>
          </div>

          {canEdit ? (
            <Button
              type="submit"
              className="w-full shrink-0 sm:w-auto"
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

          {!canEdit ? (
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Você possui acesso somente para leitura nesta organização.
            </div>
          ) : null}
        </header>

        <nav
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 xl:col-start-1 xl:row-start-2 xl:mt-7"
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

        <div className="min-w-0 xl:col-start-1 xl:row-start-3 xl:min-h-0 xl:overflow-y-auto">
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

        <div className="min-w-0 xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:min-h-0 xl:overflow-hidden">
          <div className="xl:flex xl:h-full xl:min-h-0 xl:pb-6">
            <aside
              className="w-full xl:min-h-0 xl:flex-1"
              aria-label="Prévia do widget"
            >
              <SnippetPreview
                form={form}
                activeTab={activeTab}
                webhookUrl={webhookUrl}
                selected={selected}
                isOpen={previewOpen}
                onOpenChange={setPreviewOpen}
              />
            </aside>
          </div>
        </div>
      </div>

      <LucideIconPicker
        open={iconPickerOpen}
        value={form.launcherIcon}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(launcherIcon) =>
          setForm((current) => ({
            ...current,
            launcherType: "icon",
            launcherIcon,
          }))
        }
      />
    </form>
  );
}
