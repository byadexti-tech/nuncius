type LogFields = Record<string, unknown>;

function redactErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "unknown_error";
  return error.message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]")
    .replace(/\b(?:eyJ|sb_)[A-Za-z0-9._-]{20,}\b/g, "[token]")
    .slice(0, 300);
}

export function logInfo(message: string, fields: LogFields = {}) {
  console.log(
    JSON.stringify({
      level: "info",
      message,
      timestamp: new Date().toISOString(),
      ...fields,
    }),
  );
}

export function logWarning(message: string, fields: LogFields = {}) {
  console.warn(
    JSON.stringify({
      level: "warning",
      message,
      timestamp: new Date().toISOString(),
      ...fields,
    }),
  );
}

export function logError(
  message: string,
  error: unknown,
  fields: LogFields = {},
) {
  console.error(
    JSON.stringify({
      level: "error",
      message,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: redactErrorMessage(error),
      timestamp: new Date().toISOString(),
      ...fields,
    }),
  );
}
