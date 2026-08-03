alter table public.snippets
  add column if not exists intro_phrases jsonb not null
  default '[
    {"text":"Uma revolução chegou para ficar.","durationMs":2500},
    {"text":"A IA veio para revolucionar.","durationMs":2500},
    {"text":"Mais ideias. Respostas mais rápidas. Novas possibilidades.","durationMs":2500},
    {"text":"E agora, tudo isso está ao seu alcance.","durationMs":2500}
  ]'::jsonb;

alter table public.snippets
  add constraint snippets_intro_phrases_valid
  check (
    jsonb_typeof(intro_phrases) = 'array'
    and jsonb_array_length(intro_phrases) between 1 and 10
  );

comment on column public.snippets.intro_phrases is
  'Frases da apresentação inicial e duração individual em milissegundos.';
