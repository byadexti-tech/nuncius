import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-vercel-id") ??
    crypto.randomUUID();

  if (request.nextUrl.pathname.startsWith("/admin")) {
    return updateSession(request, requestId);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("X-Request-Id", requestId);
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
