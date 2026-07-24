import {
  SNIPPET_ICONS,
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

export function validateSnippetInput(value: unknown): SnippetValidationResult {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Informe os dados do snippet." };
  }

  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const launcherIcon =
    typeof body.launcherIcon === "string" ? body.launcherIcon : "";
  const primaryColor =
    typeof body.primaryColor === "string"
      ? body.primaryColor.trim().toUpperCase()
      : "";
  const themeMode = typeof body.themeMode === "string" ? body.themeMode : "";
  const position = typeof body.position === "string" ? body.position : "";

  if (name.length < 2 || name.length > 80) {
    return {
      ok: false,
      error: "O nome do snippet deve ter entre 2 e 80 caracteres.",
    };
  }
  if (!SNIPPET_ICONS.includes(launcherIcon as SnippetInput["launcherIcon"])) {
    return { ok: false, error: "Escolha um ícone válido." };
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
  if (!SNIPPET_POSITIONS.includes(position as SnippetInput["position"])) {
    return { ok: false, error: "Escolha uma posição válida." };
  }

  return {
    ok: true,
    data: {
      name,
      launcherIcon: launcherIcon as SnippetInput["launcherIcon"],
      primaryColor,
      themeMode: themeMode as SnippetInput["themeMode"],
      position: position as SnippetInput["position"],
    },
  };
}
