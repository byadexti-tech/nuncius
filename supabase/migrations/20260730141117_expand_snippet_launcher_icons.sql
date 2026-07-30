alter table public.snippets
  drop constraint if exists snippets_launcher_icon_check;

alter table public.snippets
  add constraint snippets_launcher_icon_check
    check (
      char_length(launcher_icon) between 1 and 80
      and launcher_icon ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    );

comment on column public.snippets.launcher_icon is
  'Nome kebab-case de um ícone do catálogo Lucide.';
