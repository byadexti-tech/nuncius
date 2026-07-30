alter table public.snippets
  add column if not exists header_title text not null default 'Como podemos ajudar?'
    check (char_length(header_title) between 2 and 80);

comment on column public.snippets.header_title is
  'Título exibido no cabeçalho do widget.';
