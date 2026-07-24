import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.app_metadata?.role !== "admin") {
    return null;
  }

  return user;
}

export async function requireAdminResponse() {
  const user = await getAdminUser();
  if (user) return null;

  return Response.json(
    { error: "Acesso administrativo não autorizado." },
    { status: 401 },
  );
}
