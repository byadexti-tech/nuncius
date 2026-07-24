import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  PublicSnippetConfig,
  Snippet,
  SnippetInput,
} from "@/lib/types";

const SNIPPET_COLUMNS =
  "id,project_id,name,launcher_icon,primary_color,theme_mode,position,created_at,updated_at";

function toDatabaseInput(input: SnippetInput) {
  return {
    name: input.name,
    launcher_icon: input.launcherIcon,
    primary_color: input.primaryColor,
    theme_mode: input.themeMode,
    position: input.position,
  };
}

export async function listSnippets(projectId: string): Promise<Snippet[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("snippets")
    .select(SNIPPET_COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Snippet[];
}

export async function getSnippet(id: string): Promise<Snippet | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("snippets")
    .select(SNIPPET_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Snippet | null;
}

export async function getPublicSnippetConfig(
  id: string,
): Promise<PublicSnippetConfig | null> {
  const snippet = await getSnippet(id);
  if (!snippet) return null;

  return {
    id: snippet.id,
    launcherIcon: snippet.launcher_icon,
    primaryColor: snippet.primary_color,
    themeMode: snippet.theme_mode,
    position: snippet.position,
  };
}

export async function createSnippet(
  projectId: string,
  input: SnippetInput,
): Promise<Snippet> {
  const { data, error } = await getSupabaseAdmin()
    .from("snippets")
    .insert({ project_id: projectId, ...toDatabaseInput(input) })
    .select(SNIPPET_COLUMNS)
    .single();

  if (error) throw error;
  return data as Snippet;
}

export async function updateSnippet(
  id: string,
  input: SnippetInput,
): Promise<Snippet | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("snippets")
    .update(toDatabaseInput(input))
    .eq("id", id)
    .select(SNIPPET_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data as Snippet | null;
}

export async function duplicateSnippet(id: string): Promise<Snippet | null> {
  const original = await getSnippet(id);
  if (!original) return null;

  return createSnippet(original.project_id, {
    name: `${original.name} - Cópia`.slice(0, 80),
    launcherIcon: original.launcher_icon,
    primaryColor: original.primary_color,
    themeMode: original.theme_mode,
    position: original.position,
  });
}

export async function deleteSnippet(
  id: string,
): Promise<"deleted" | "not-found" | "last-snippet"> {
  const snippet = await getSnippet(id);
  if (!snippet) return "not-found";

  const { count, error: countError } = await getSupabaseAdmin()
    .from("snippets")
    .select("id", { count: "exact", head: true })
    .eq("project_id", snippet.project_id);

  if (countError) throw countError;
  if ((count ?? 0) <= 1) return "last-snippet";

  const { data, error } = await getSupabaseAdmin()
    .from("snippets")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data ? "deleted" : "not-found";
}
