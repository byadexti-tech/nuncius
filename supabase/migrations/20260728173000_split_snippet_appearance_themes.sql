alter table public.snippets
  add column if not exists light_primary_color text not null default '#6D46E8' check (light_primary_color ~ '^#[0-9A-F]{6}$'),
  add column if not exists light_primary_text_color text not null default '#FFFFFF' check (light_primary_text_color ~ '^#[0-9A-F]{6}$'),
  add column if not exists dark_primary_color text not null default '#6D46E8' check (dark_primary_color ~ '^#[0-9A-F]{6}$'),
  add column if not exists dark_primary_text_color text not null default '#FFFFFF' check (dark_primary_text_color ~ '^#[0-9A-F]{6}$');

update public.snippets
set
  light_primary_color = button_background_color,
  light_primary_text_color = button_text_color,
  dark_primary_color = button_background_color,
  dark_primary_text_color = button_text_color
where appearance_customizations_enabled;

alter table public.snippets
  drop constraint if exists snippets_font_family_check;

alter table public.snippets
  add constraint snippets_font_family_check
  check (font_family ~ '^[A-Za-z0-9 ]{1,80}$');
