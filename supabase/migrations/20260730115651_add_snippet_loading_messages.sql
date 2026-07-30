alter table public.snippets
  add column if not exists loading_messages text[] not null
  default array[
    'Pesquisando...',
    'Analisando...',
    'Pensando...',
    'Escolhendo a melhor resposta...'
  ]::text[];

alter table public.snippets
  add constraint snippets_loading_messages_valid
  check (
    cardinality(loading_messages) between 1 and 10
    and array_position(loading_messages, null) is null
  );

comment on column public.snippets.loading_messages is
  'Mensagens exibidas em sequência enquanto o visitante aguarda a resposta.';
