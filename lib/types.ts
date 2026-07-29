export type Project = {
  id: string;
  organization_id: string;
  name: string;
  webhook_url: string;
  created_at: string;
  updated_at: string;
};

export const ORGANIZATION_TYPES = ["individual", "company", "agency"] as const;
export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "editor",
  "viewer",
  "billing",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export type Organization = {
  id: string;
  name: string;
  type: OrganizationType;
  created_at: string;
  updated_at: string;
};

export type OrganizationMembership = {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  status: "active" | "suspended";
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

export const SNIPPET_FONTS = [
  "Inter",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Roboto",
  "Open Sans",
  "Poppins",
] as const;

export const SNIPPET_POSITIONS = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
] as const;

export const SNIPPET_LAUNCHER_TYPES = ["icon", "image"] as const;
export const SNIPPET_ORIGIN_POLICIES = ["allow_all", "allowlist"] as const;

export type SnippetIcon = (typeof SNIPPET_ICONS)[number];
export type SnippetTheme = (typeof SNIPPET_THEMES)[number];
export type SnippetFont = string;
export type SnippetPosition = (typeof SNIPPET_POSITIONS)[number];
export type SnippetLauncherType = (typeof SNIPPET_LAUNCHER_TYPES)[number];
export type SnippetOriginPolicy = (typeof SNIPPET_ORIGIN_POLICIES)[number];

export type Snippet = {
  id: string;
  project_id: string;
  name: string;
  launcher_type: SnippetLauncherType;
  launcher_icon: SnippetIcon;
  launcher_image: string | null;
  primary_color: string;
  theme_mode: SnippetTheme;
  appearance_customizations_enabled: boolean;
  light_background_color: string;
  light_text_color: string;
  dark_background_color: string;
  dark_text_color: string;
  light_primary_color: string;
  light_primary_text_color: string;
  dark_primary_color: string;
  dark_primary_text_color: string;
  font_family: SnippetFont;
  position: SnippetPosition;
  auto_start_enabled: boolean;
  auto_start_message: string;
  is_active: boolean;
  origin_policy: SnippetOriginPolicy;
  allowed_origins: string[];
  created_at: string;
  updated_at: string;
};

export type SnippetInput = {
  name: string;
  launcherType: SnippetLauncherType;
  launcherIcon: SnippetIcon;
  launcherImage: string | null;
  primaryColor: string;
  themeMode: SnippetTheme;
  appearanceCustomizationsEnabled: boolean;
  lightBackgroundColor: string;
  lightTextColor: string;
  darkBackgroundColor: string;
  darkTextColor: string;
  lightPrimaryColor: string;
  lightPrimaryTextColor: string;
  darkPrimaryColor: string;
  darkPrimaryTextColor: string;
  fontFamily: SnippetFont;
  position: SnippetPosition;
  autoStartEnabled: boolean;
  autoStartMessage: string;
  isActive: boolean;
  originPolicy: SnippetOriginPolicy;
  allowedOrigins: string[];
};

export type PublicSnippetConfig = {
  id: string;
  launcherType: SnippetLauncherType;
  launcherIcon: SnippetIcon;
  launcherImage: string | null;
  primaryColor: string;
  themeMode: SnippetTheme;
  appearanceCustomizationsEnabled: boolean;
  lightBackgroundColor: string;
  lightTextColor: string;
  darkBackgroundColor: string;
  darkTextColor: string;
  lightPrimaryColor: string;
  lightPrimaryTextColor: string;
  darkPrimaryColor: string;
  darkPrimaryTextColor: string;
  fontFamily: SnippetFont;
  position: SnippetPosition;
  autoStartEnabled: boolean;
};
