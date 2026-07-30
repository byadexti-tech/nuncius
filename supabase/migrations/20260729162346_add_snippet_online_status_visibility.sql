alter table public.snippets
  add column if not exists show_online_status boolean not null default true;

comment on column public.snippets.show_online_status is
  'Controla se o status Online agora aparece no cabeçalho do widget.';
