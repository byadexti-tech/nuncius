import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Project, ProjectInput } from "@/lib/types";

const PROJECT_COLUMNS =
  "id,organization_id,name,webhook_url,created_at,updated_at";

export async function listProjects(organizationId: string): Promise<Project[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProject(
  organizationId: string,
  input: ProjectInput,
): Promise<Project> {
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .insert({
      organization_id: organizationId,
      name: input.name,
      webhook_url: input.webhookUrl,
    })
    .select(PROJECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<Project | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .update({
      name: input.name,
      webhook_url: input.webhookUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PROJECT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
