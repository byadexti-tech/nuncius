alter table public.snippets
  add column if not exists appearance_customizations_enabled boolean not null default false,
  add column if not exists light_background_color text not null default '#FFFFFF' check (light_background_color ~ '^#[0-9A-F]{6}$'),
  add column if not exists light_text_color text not null default '#172033' check (light_text_color ~ '^#[0-9A-F]{6}$'),
  add column if not exists dark_background_color text not null default '#151823' check (dark_background_color ~ '^#[0-9A-F]{6}$'),
  add column if not exists dark_text_color text not null default '#F4F5F8' check (dark_text_color ~ '^#[0-9A-F]{6}$'),
  add column if not exists button_background_color text not null default '#6D46E8' check (button_background_color ~ '^#[0-9A-F]{6}$'),
  add column if not exists button_text_color text not null default '#FFFFFF' check (button_text_color ~ '^#[0-9A-F]{6}$'),
  add column if not exists font_family text not null default 'Inter' check (font_family in ('Inter', 'DM Sans', 'Manrope', 'Plus Jakarta Sans', 'Roboto', 'Open Sans', 'Poppins'));

comment on column public.snippets.appearance_customizations_enabled is
  'Quando falso, o snippet usa o tema visual padrão; quando verdadeiro, usa as cores e fonte configuradas.';
