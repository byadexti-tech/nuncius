alter table public.snippets
  add column if not exists auto_start_enabled boolean not null default false,
  add column if not exists auto_start_message text not null default 'Olá';

alter table public.snippets
  drop constraint if exists snippets_auto_start_message_length;

alter table public.snippets
  add constraint snippets_auto_start_message_length
  check (char_length(btrim(auto_start_message)) between 1 and 4000);

comment on column public.snippets.auto_start_enabled is
  'Dispara o webhook na primeira abertura do widget para obter a saudação.';
comment on column public.snippets.auto_start_message is
  'Mensagem técnica enviada ao webhook no evento chat_opened; não é exibida ao visitante.';
