export type Project = {
  id: string;
  name: string;
  webhook_url: string;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = {
  name: string;
  webhookUrl: string;
};

export const SNIPPET_ICONS = [
  "message-circle",
  "messages-square",
  "headphones",
  "bot",
  "circle-help",
] as const;

export const SNIPPET_THEMES = ["light", "dark", "system", "attribute"] as const;

export const SNIPPET_POSITIONS = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
] as const;

export type SnippetIcon = (typeof SNIPPET_ICONS)[number];
export type SnippetTheme = (typeof SNIPPET_THEMES)[number];
export type SnippetPosition = (typeof SNIPPET_POSITIONS)[number];

export type Snippet = {
  id: string;
  project_id: string;
  name: string;
  launcher_icon: SnippetIcon;
  primary_color: string;
  theme_mode: SnippetTheme;
  position: SnippetPosition;
  created_at: string;
  updated_at: string;
};

export type SnippetInput = {
  name: string;
  launcherIcon: SnippetIcon;
  primaryColor: string;
  themeMode: SnippetTheme;
  position: SnippetPosition;
};

export type PublicSnippetConfig = {
  id: string;
  launcherIcon: SnippetIcon;
  primaryColor: string;
  themeMode: SnippetTheme;
  position: SnippetPosition;
};
