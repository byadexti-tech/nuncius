import type { Instrumentation } from "next";
import { logError, logInfo } from "@/lib/logger";

export function register() {
  logInfo("instrumentation_registered", {
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
  });
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const rawRequestId = request.headers["x-request-id"];
  const requestId = Array.isArray(rawRequestId)
    ? rawRequestId[0]
    : rawRequestId;

  logError("unhandled_request_error", error, {
    method: request.method,
    path: request.path.split("?")[0],
    requestId,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
};
