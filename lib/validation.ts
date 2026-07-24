import type { ProjectInput } from "@/lib/types";

type ValidationResult =
  | { ok: true; data: ProjectInput }
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
