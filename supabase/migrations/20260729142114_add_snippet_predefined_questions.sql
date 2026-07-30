alter table public.snippets
  add column if not exists activation_mode text not null default 'free_text',
  add column if not exists activation_questions text[] not null default '{}';

alter table public.snippets
  drop constraint if exists snippets_activation_mode_check,
  drop constraint if exists snippets_activation_questions_check;

alter table public.snippets
  add constraint snippets_activation_mode_check
  check (activation_mode in ('free_text', 'predefined_questions')),
  add constraint snippets_activation_questions_check
  check (
    activation_mode = 'free_text'
    or cardinality(activation_questions) > 0
  );

comment on column public.snippets.activation_mode is
  'free_text libera o compositor imediatamente; predefined_questions exige o primeiro clique em uma pergunta cadastrada.';
comment on column public.snippets.activation_questions is
  'Perguntas clicáveis enviadas ao webhook como a primeira mensagem visível do visitante.';
