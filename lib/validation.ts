import {
  SNIPPET_ICONS,
  SNIPPET_LAUNCHER_TYPES,
  SNIPPET_ORIGIN_POLICIES,
  SNIPPET_POSITIONS,
  SNIPPET_THEMES,
  type ProjectInput,
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
  const fontFamily = typeof body.fontFamily === "string" ? body.fontFamily : "";
  const position = typeof body.position === "string" ? body.position : "";
  const autoStartEnabled = body.autoStartEnabled === true;
  const autoStartMessage =
    typeof body.autoStartMessage === "string"
      ? body.autoStartMessage.trim()
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
  if (!SNIPPET_ICONS.includes(launcherIcon as SnippetInput["launcherIcon"])) {
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
  if (!SNIPPET_POSITIONS.includes(position as SnippetInput["position"])) {
    return { ok: false, error: "Escolha uma posição válida." };
  }
  if (autoStartMessage.length < 1 || autoStartMessage.length > 4000) {
    return {
      ok: false,
      error: "A mensagem de ativação deve ter entre 1 e 4.000 caracteres.",
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
      fontFamily,
      position: position as SnippetInput["position"],
      autoStartEnabled,
      autoStartMessage,
      isActive,
      originPolicy: originPolicy as SnippetInput["originPolicy"],
      allowedOrigins: allowedOrigins as string[],
    },
  };
}
