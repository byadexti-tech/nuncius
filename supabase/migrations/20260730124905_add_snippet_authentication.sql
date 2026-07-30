alter table public.snippets
  add column if not exists auth_enabled boolean not null default false,
  add column if not exists auth_mode text not null default 'manual',
  add column if not exists auth_title text not null default 'Acesse sua conta',
  add column if not exists auth_description text not null default 'Entre para iniciar o atendimento.';

alter table public.snippets
  add constraint snippets_auth_mode_check
    check (auth_mode in ('manual', 'automatic')),
  add constraint snippets_auth_title_length_check
    check (char_length(auth_title) between 2 and 80),
  add constraint snippets_auth_description_length_check
    check (char_length(auth_description) <= 240);

comment on column public.snippets.auth_enabled is
  'Quando verdadeiro, o widget exige autenticação validada pelo webhook do projeto.';
comment on column public.snippets.auth_mode is
  'manual exibe usuário e senha; automatic valida um token opaco fornecido pelo site hospedeiro.';
comment on column public.snippets.auth_title is
  'Título da etapa de autenticação exibida dentro do widget.';
comment on column public.snippets.auth_description is
  'Texto auxiliar da etapa de autenticação exibida dentro do widget.';
