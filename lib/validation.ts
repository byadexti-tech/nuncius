import dynamicIconImports from "lucide-react/dynamicIconImports";
import {
  SNIPPET_ACTIVATION_MODES,
  SNIPPET_AUTH_MODES,
  SNIPPET_LAUNCHER_TYPES,
  SNIPPET_ORIGIN_POLICIES,
  SNIPPET_POSITIONS,
  SNIPPET_THEMES,
  type ProjectInput,
  type SnippetIntroPhrase,
  type SnippetInput,
} from "@/lib/types";

type ValidationResult =
  | { ok: true; data: ProjectInput }
  | { ok: false; error: string };

type SnippetValidationResult =
  | { ok: true; data: SnippetInput }
  | { ok: false; error: string };

const MAX_LAUNCHER_IMAGE_LENGTH = 400_000;
const PNG_DATA_URL_PATTERN = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/;
const DEFAULT_INTRO_PHRASES: SnippetIntroPhrase[] = [
  { text: "Uma revolução chegou para ficar.", durationMs: 2500 },
  { text: "A IA veio para revolucionar.", durationMs: 2500 },
  {
    text: "Mais ideias. Respostas mais rápidas. Novas possibilidades.",
    durationMs: 2500,
  },
  { text: "E agora, tudo isso está ao seu alcance.", durationMs: 2500 },
];

function isSquarePngDataUrl(value: string) {
  const match = value.match(PNG_DATA_URL_PATTERN);
  if (!match) return false;

  try {
    const bytes = Buffer.from(match[1], "base64");
    const signature = "89504e470d0a1a0a";
    if (bytes.length < 33 || bytes.subarray(0, 8).toString("hex") !== signature) {
      return false;
    }

    const chunkType = bytes.subarray(12, 16).toString("ascii");
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const colorType = bytes[25];
    const supportsAlpha =
      colorType === 4 ||
      colorType === 6 ||
      bytes.includes(Buffer.from("tRNS", "ascii"));

    return (
      chunkType === "IHDR" &&
      width > 0 &&
      width === height &&
      width <= 256 &&
      supportsAlpha
    );
  } catch {
    return false;
  }
}

export function validateProjectInput(value: unknown): ValidationResult {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Informe os dados do projeto." };
  }

  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const webhookUrl =
    typeof body.webhookUrl === "string" ? body.webhookUrl.trim() : "";

  if (name.length < 2 || name.length > 80) {
    return {
      ok: false,
      error: "O nome deve ter entre 2 e 80 caracteres.",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webhookUrl);
  } catch {
    return { ok: false, error: "Informe uma URL de webhook válida." };
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { ok: false, error: "O webhook deve usar HTTP ou HTTPS." };
  }

  return { ok: true, data: { name, webhookUrl: parsedUrl.toString() } };
}

export function isValidProjectId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const isValidSnippetId = isValidProjectId;

export function normalizeAllowedOrigin(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function validateSnippetInput(value: unknown): SnippetValidationResult {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Informe os dados do snippet." };
  }

  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const launcherType =
    typeof body.launcherType === "string" ? body.launcherType : "";
  const launcherIcon =
    typeof body.launcherIcon === "string" ? body.launcherIcon : "";
  const launcherImage =
    typeof body.launcherImage === "string" ? body.launcherImage.trim() : null;
  const primaryColor =
    typeof body.primaryColor === "string"
      ? body.primaryColor.trim().toUpperCase()
      : "";
  const themeMode = typeof body.themeMode === "string" ? body.themeMode : "";
  const appearanceCustomizationsEnabled = body.appearanceCustomizationsEnabled === true;
  const lightBackgroundColor = typeof body.lightBackgroundColor === "string" ? body.lightBackgroundColor.trim().toUpperCase() : "";
  const lightTextColor = typeof body.lightTextColor === "string" ? body.lightTextColor.trim().toUpperCase() : "";
  const darkBackgroundColor = typeof body.darkBackgroundColor === "string" ? body.darkBackgroundColor.trim().toUpperCase() : "";
  const darkTextColor = typeof body.darkTextColor === "string" ? body.darkTextColor.trim().toUpperCase() : "";
  const lightPrimaryColor = typeof body.lightPrimaryColor === "string" ? body.lightPrimaryColor.trim().toUpperCase() : "";
  const lightPrimaryTextColor = typeof body.lightPrimaryTextColor === "string" ? body.lightPrimaryTextColor.trim().toUpperCase() : "";
  const darkPrimaryColor = typeof body.darkPrimaryColor === "string" ? body.darkPrimaryColor.trim().toUpperCase() : "";
  const darkPrimaryTextColor = typeof body.darkPrimaryTextColor === "string" ? body.darkPrimaryTextColor.trim().toUpperCase() : "";
  const hidePoweredBy = body.hidePoweredBy === true;
  const headerTitle =
    typeof body.headerTitle === "string" ? body.headerTitle.trim() : "";
  const showOnlineStatus = body.showOnlineStatus !== false;
  const fontFamily = typeof body.fontFamily === "string" ? body.fontFamily : "";
  const position = typeof body.position === "string" ? body.position : "";
  const autoStartEnabled = body.autoStartEnabled === true;
  const autoStartMessage =
    typeof body.autoStartMessage === "string"
      ? body.autoStartMessage.trim()
      : "";
  const activationMode =
    typeof body.activationMode === "string" ? body.activationMode : "";
  const activationPrompt =
    typeof body.activationPrompt === "string"
      ? body.activationPrompt.trim()
      : "";
  const rawActivationQuestions = Array.isArray(body.activationQuestions)
    ? body.activationQuestions
    : [];
  if (
    rawActivationQuestions.some((question) => typeof question !== "string")
  ) {
    return { ok: false, error: "As perguntas pré-definidas são inválidas." };
  }
  const activationQuestions = rawActivationQuestions.map((question) =>
    (question as string).trim(),
  );
  const showInputWithPredefinedQuestions =
    body.showInputWithPredefinedQuestions !== false;
  const rawLoadingMessages = Array.isArray(body.loadingMessages)
    ? body.loadingMessages
    : [];
  if (rawLoadingMessages.some((message) => typeof message !== "string")) {
    return { ok: false, error: "As mensagens de espera são inválidas." };
  }
  const loadingMessages = rawLoadingMessages.map((message) =>
    (message as string).trim(),
  );
  const rawIntroPhrases = Array.isArray(body.introPhrases)
    ? body.introPhrases
    : DEFAULT_INTRO_PHRASES;
  if (
    rawIntroPhrases.some(
      (phrase) =>
        !phrase ||
        typeof phrase !== "object" ||
        typeof (phrase as Record<string, unknown>).text !== "string" ||
        typeof (phrase as Record<string, unknown>).durationMs !== "number",
    )
  ) {
    return { ok: false, error: "As frases da apresentação são inválidas." };
  }
  const introPhrases = rawIntroPhrases.map((phrase) => ({
    text: ((phrase as Record<string, unknown>).text as string).trim(),
    durationMs: (phrase as Record<string, unknown>).durationMs as number,
  }));
  const authEnabled = body.authEnabled === true;
  const authMode = typeof body.authMode === "string" ? body.authMode : "";
  const authTitle =
    typeof body.authTitle === "string" ? body.authTitle.trim() : "";
  const authDescription =
    typeof body.authDescription === "string"
      ? body.authDescription.trim()
      : "";
  const isActive = body.isActive === true;
  const originPolicy = typeof body.originPolicy === "string" ? body.originPolicy : "";
  const rawOrigins = Array.isArray(body.allowedOrigins) ? body.allowedOrigins : [];
  if (rawOrigins.some((origin) => typeof origin !== "string")) {
    return { ok: false, error: "As origens autorizadas são inválidas." };
  }
  const allowedOrigins = [...new Set(rawOrigins.map((origin) => normalizeAllowedOrigin(origin as string)))];

  if (name.length < 2 || name.length > 80) {
    return {
      ok: false,
      error: "O nome do snippet deve ter entre 2 e 80 caracteres.",
    };
  }
  if (
    !SNIPPET_LAUNCHER_TYPES.includes(
      launcherType as SnippetInput["launcherType"],
    )
  ) {
    return { ok: false, error: "Escolha usar um ícone ou uma imagem." };
  }
  if (!(launcherIcon in dynamicIconImports)) {
    return { ok: false, error: "Escolha um ícone válido." };
  }
  if (launcherType === "image" && !launcherImage) {
    return {
      ok: false,
      error: "Envie uma imagem para usar no botão.",
    };
  }
  if (
    launcherImage &&
    (launcherImage.length > MAX_LAUNCHER_IMAGE_LENGTH ||
      !isSquarePngDataUrl(launcherImage))
  ) {
    return {
      ok: false,
      error:
        "Envie uma imagem PNG transparente, quadrada e com até 256 × 256 px.",
    };
  }
  if (!/^#[0-9A-F]{6}$/.test(primaryColor)) {
    return {
      ok: false,
      error: "A cor primária deve estar no formato hexadecimal #RRGGBB.",
    };
  }
  if (!SNIPPET_THEMES.includes(themeMode as SnippetInput["themeMode"])) {
    return { ok: false, error: "Escolha um tema válido." };
  }
  const appearanceColors = [lightBackgroundColor, lightTextColor, darkBackgroundColor, darkTextColor, lightPrimaryColor, lightPrimaryTextColor, darkPrimaryColor, darkPrimaryTextColor];
  if (appearanceColors.some((color) => !/^#[0-9A-F]{6}$/.test(color))) {
    return { ok: false, error: "As cores de aparência devem estar no formato hexadecimal #RRGGBB." };
  }
  if (!/^[A-Za-z0-9 ]{1,80}$/.test(fontFamily)) {
    return { ok: false, error: "Informe uma fonte do Google Fonts válida." };
  }
  if (headerTitle.length < 2 || headerTitle.length > 80) {
    return {
      ok: false,
      error: "O título do cabeçalho deve ter entre 2 e 80 caracteres.",
    };
  }
  if (!SNIPPET_POSITIONS.includes(position as SnippetInput["position"])) {
    return { ok: false, error: "Escolha uma posição válida." };
  }
  if (autoStartMessage.length < 1 || autoStartMessage.length > 4000) {
    return {
      ok: false,
      error: "A mensagem de ativação deve ter entre 1 e 4.000 caracteres.",
    };
  }
  if (
    !SNIPPET_ACTIVATION_MODES.includes(
      activationMode as SnippetInput["activationMode"],
    )
  ) {
    return { ok: false, error: "Escolha um modo de ativação válido." };
  }
  if (activationPrompt.length < 1 || activationPrompt.length > 200) {
    return {
      ok: false,
      error: "O texto de apresentação deve ter entre 1 e 200 caracteres.",
    };
  }
  if (
    activationQuestions.some(
      (question) => question.length < 1 || question.length > 4000,
    )
  ) {
    return {
      ok: false,
      error: "Cada pergunta deve ter entre 1 e 4.000 caracteres.",
    };
  }
  if (
    activationMode === "predefined_questions" &&
    activationQuestions.length === 0
  ) {
    return {
      ok: false,
      error: "Adicione pelo menos uma pergunta pré-definida.",
    };
  }
  if (
    loadingMessages.length < 1 ||
    loadingMessages.length > 10 ||
    loadingMessages.some(
      (message) => message.length < 1 || message.length > 80,
    )
  ) {
    return {
      ok: false,
      error:
        "Informe entre 1 e 10 mensagens de espera, com até 80 caracteres cada.",
    };
  }
  if (
    introPhrases.length < 1 ||
    introPhrases.length > 10 ||
    introPhrases.some(
      (phrase) =>
        phrase.text.length < 1 ||
        phrase.text.length > 200 ||
        !Number.isInteger(phrase.durationMs) ||
        phrase.durationMs < 500 ||
        phrase.durationMs > 15_000,
    )
  ) {
    return {
      ok: false,
      error:
        "Informe entre 1 e 10 frases de apresentação, com até 200 caracteres e duração entre 0,5 e 15 segundos.",
    };
  }
  if (!SNIPPET_AUTH_MODES.includes(authMode as SnippetInput["authMode"])) {
    return { ok: false, error: "Escolha um método de autenticação válido." };
  }
  if (authTitle.length < 2 || authTitle.length > 80) {
    return {
      ok: false,
      error: "O título da autenticação deve ter entre 2 e 80 caracteres.",
    };
  }
  if (authDescription.length > 240) {
    return {
      ok: false,
      error: "A descrição da autenticação deve ter até 240 caracteres.",
    };
  }
  if (!SNIPPET_ORIGIN_POLICIES.includes(originPolicy as SnippetInput["originPolicy"])) {
    return { ok: false, error: "Escolha uma política de origem válida." };
  }
  if (allowedOrigins.some((origin) => !origin) || allowedOrigins.length > 20) {
    return { ok: false, error: "Informe até 20 origens válidas, sem caminhos ou curingas." };
  }
  if (isActive && originPolicy === "allowlist" && allowedOrigins.length === 0) {
    return { ok: false, error: "Adicione uma origem autorizada antes de ativar o snippet." };
  }

  return {
    ok: true,
    data: {
      name,
      launcherType: launcherType as SnippetInput["launcherType"],
      launcherIcon: launcherIcon as SnippetInput["launcherIcon"],
      launcherImage,
      primaryColor,
      themeMode: themeMode as SnippetInput["themeMode"],
      appearanceCustomizationsEnabled,
      lightBackgroundColor,
      lightTextColor,
      darkBackgroundColor,
      darkTextColor,
      lightPrimaryColor,
      lightPrimaryTextColor,
      darkPrimaryColor,
      darkPrimaryTextColor,
      hidePoweredBy,
      headerTitle,
      showOnlineStatus,
      fontFamily,
      position: position as SnippetInput["position"],
      autoStartEnabled,
      autoStartMessage,
      activationMode: activationMode as SnippetInput["activationMode"],
      activationPrompt,
      activationQuestions,
      showInputWithPredefinedQuestions,
      loadingMessages,
      introPhrases,
      authEnabled,
      authMode: authMode as SnippetInput["authMode"],
      authTitle,
      authDescription,
      isActive,
      originPolicy: originPolicy as SnippetInput["originPolicy"],
      allowedOrigins: allowedOrigins as string[],
    },
  };
}
