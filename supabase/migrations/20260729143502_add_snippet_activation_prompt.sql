alter table public.snippets
  add column if not exists activation_prompt text not null
  default 'Escolha uma pergunta para começar';

alter table public.snippets
  drop constraint if exists snippets_activation_prompt_length;

alter table public.snippets
  add constraint snippets_activation_prompt_length
  check (char_length(btrim(activation_prompt)) between 1 and 200);

comment on column public.snippets.activation_prompt is
  'Texto centralizado exibido acima das perguntas pré-definidas no widget.';
