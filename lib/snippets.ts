import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getProject } from "@/lib/projects";
import type {
  PublicSnippetConfig,
  Snippet,
  SnippetInput,
} from "@/lib/types";

const SNIPPET_COLUMNS =
  "id,project_id,name,launcher_type,launcher_icon,launcher_image,primary_color,theme_mode,appearance_customizations_enabled,light_background_color,light_text_color,dark_background_color,dark_text_color,light_primary_color,light_primary_text_color,dark_primary_color,dark_primary_text_color,hide_powered_by,header_title,show_online_status,font_family,position,auto_start_enabled,auto_start_message,activation_mode,activation_prompt,activation_questions,show_input_with_predefined_questions,loading_messages,intro_phrases,auth_enabled,auth_mode,auth_title,auth_description,is_active,origin_policy,allowed_origins,created_at,updated_at";

function toDatabaseInput(input: SnippetInput) {
  return {
    name: input.name,
    launcher_type: input.launcherType,
    launcher_icon: input.launcherIcon,
    launcher_image: input.launcherImage,
    primary_color: input.primaryColor,
    theme_mode: input.themeMode,
    appearance_customizations_enabled: input.appearanceCustomizationsEnabled,
    light_background_color: input.lightBackgroundColor,
    light_text_color: input.lightTextColor,
    dark_background_color: input.darkBackgroundColor,
    dark_text_color: input.darkTextColor,
    light_primary_color: input.lightPrimaryColor,
    light_primary_text_color: input.lightPrimaryTextColor,
    dark_primary_color: input.darkPrimaryColor,
    dark_primary_text_color: input.darkPrimaryTextColor,
    hide_powered_by: input.hidePoweredBy,
    header_title: input.headerTitle,
    show_online_status: input.showOnlineStatus,
    font_family: input.fontFamily,
    position: input.position,
    auto_start_enabled: input.autoStartEnabled,
    auto_start_message: input.autoStartMessage,
    activation_mode: input.activationMode,
    activation_prompt: input.activationPrompt,
    activation_questions: input.activationQuestions,
    show_input_with_predefined_questions:
      input.showInputWithPredefinedQuestions,
    loading_messages: input.loadingMessages,
    intro_phrases: input.introPhrases,
    auth_enabled: input.authEnabled,
    auth_mode: input.authMode,
    auth_title: input.authTitle,
    auth_description: input.authDescription,
    is_active: input.isActive,
    origin_policy: input.originPolicy,
    allowed_origins: input.allowedOrigins,
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
  const project = await getProject(snippet.project_id);

  return {
    id: snippet.id,
    launcherType: snippet.launcher_type,
    launcherIcon: snippet.launcher_icon,
    launcherImage: snippet.launcher_image,
    primaryColor: snippet.primary_color,
    themeMode: snippet.theme_mode,
    appearanceCustomizationsEnabled: snippet.appearance_customizations_enabled,
    lightBackgroundColor: snippet.light_background_color,
    lightTextColor: snippet.light_text_color,
    darkBackgroundColor: snippet.dark_background_color,
    darkTextColor: snippet.dark_text_color,
    lightPrimaryColor: snippet.light_primary_color,
    lightPrimaryTextColor: snippet.light_primary_text_color,
    darkPrimaryColor: snippet.dark_primary_color,
    darkPrimaryTextColor: snippet.dark_primary_text_color,
    hidePoweredBy: snippet.hide_powered_by && project?.is_premium === true,
    headerTitle: snippet.header_title,
    showOnlineStatus: snippet.show_online_status,
    fontFamily: snippet.font_family,
    position: snippet.position,
    autoStartEnabled: snippet.auto_start_enabled,
    activationMode: snippet.activation_mode,
    activationPrompt: snippet.activation_prompt,
    activationQuestions: snippet.activation_questions,
    showInputWithPredefinedQuestions:
      snippet.show_input_with_predefined_questions,
    loadingMessages: snippet.loading_messages,
    introPhrases: snippet.intro_phrases,
    authEnabled: snippet.auth_enabled,
    authMode: snippet.auth_mode,
    authTitle: snippet.auth_title,
    authDescription: snippet.auth_description,
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
    launcherType: original.launcher_type,
    launcherIcon: original.launcher_icon,
    launcherImage: original.launcher_image,
    primaryColor: original.primary_color,
    themeMode: original.theme_mode,
    appearanceCustomizationsEnabled: original.appearance_customizations_enabled,
    lightBackgroundColor: original.light_background_color,
    lightTextColor: original.light_text_color,
    darkBackgroundColor: original.dark_background_color,
    darkTextColor: original.dark_text_color,
    lightPrimaryColor: original.light_primary_color,
    lightPrimaryTextColor: original.light_primary_text_color,
    darkPrimaryColor: original.dark_primary_color,
    darkPrimaryTextColor: original.dark_primary_text_color,
    hidePoweredBy: original.hide_powered_by,
    headerTitle: original.header_title,
    showOnlineStatus: original.show_online_status,
    fontFamily: original.font_family,
    position: original.position,
    autoStartEnabled: original.auto_start_enabled,
    autoStartMessage: original.auto_start_message,
    activationMode: original.activation_mode,
    activationPrompt: original.activation_prompt,
    activationQuestions: original.activation_questions,
    showInputWithPredefinedQuestions:
      original.show_input_with_predefined_questions,
    loadingMessages: original.loading_messages,
    introPhrases: original.intro_phrases,
    authEnabled: original.auth_enabled,
    authMode: original.auth_mode,
    authTitle: original.auth_title,
    authDescription: original.auth_description,
    isActive: false,
    originPolicy: "allowlist",
    allowedOrigins: [],
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
