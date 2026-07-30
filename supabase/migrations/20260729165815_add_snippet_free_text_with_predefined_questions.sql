alter table public.snippets
  add column if not exists show_input_with_predefined_questions boolean not null
  default true;

comment on column public.snippets.show_input_with_predefined_questions is
  'Mantém o campo de texto visível desde o início no modo de perguntas pré-definidas.';
