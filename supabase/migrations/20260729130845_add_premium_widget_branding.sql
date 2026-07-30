alter table public.projects
  add column if not exists is_premium boolean not null default false;

alter table public.snippets
  add column if not exists hide_powered_by boolean not null default false;

update public.projects
set is_premium = true
where id = '7071a9d5-14e7-4964-9eb8-c8f75ff2c37b';

comment on column public.projects.is_premium is
  'Habilita recursos Premium do projeto.';

comment on column public.snippets.hide_powered_by is
  'Oculta a assinatura Powered by Nuncius quando o projeto possui plano Premium.';
