alter table public.snippets
  add column if not exists launcher_type text not null default 'icon',
  add column if not exists launcher_image text;

alter table public.snippets
  drop constraint if exists snippets_launcher_type_check,
  drop constraint if exists snippets_launcher_image_length,
  drop constraint if exists snippets_launcher_image_required;

alter table public.snippets
  add constraint snippets_launcher_type_check
    check (launcher_type in ('icon', 'image')),
  add constraint snippets_launcher_image_length
    check (
      launcher_image is null
      or (
        char_length(launcher_image) <= 400000
        and launcher_image like 'data:image/png;base64,%'
      )
    ),
  add constraint snippets_launcher_image_required
    check (
      launcher_type <> 'image'
      or launcher_image is not null
    );

comment on column public.snippets.launcher_type is
  'Define se o botão do widget usa um ícone padrão ou uma imagem personalizada.';
comment on column public.snippets.launcher_image is
  'Imagem PNG transparente e quadrada, normalizada como data URL de até 256 × 256 px.';
