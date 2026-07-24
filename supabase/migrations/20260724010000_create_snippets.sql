create table if not exists public.snippets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  launcher_icon text not null default 'message-circle'
    check (
      launcher_icon in (
        'message-circle',
        'messages-square',
        'headphones',
        'bot',
        'circle-help'
      )
    ),
  primary_color text not null default '#6D46E8'
    check (primary_color ~ '^#[0-9A-F]{6}$'),
  theme_mode text not null default 'system'
    check (theme_mode in ('light', 'dark', 'system', 'attribute')),
  position text not null default 'bottom-right'
    check (
      position in (
        'bottom-right',
        'bottom-left',
        'top-right',
        'top-left'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists snippets_project_id_idx
  on public.snippets (project_id);

alter table public.snippets enable row level security;

revoke all on table public.snippets from anon, authenticated;

comment on table public.snippets is
  'Configurações independentes dos widgets de chat de cada projeto.';
comment on column public.snippets.theme_mode is
  'light, dark, system ou attribute (lê data-theme do elemento script).';

create or replace function public.create_default_snippet_for_project()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.snippets (project_id, name)
  values (new.id, 'Snippet principal');
  return new;
end;
$$;

revoke execute on function public.create_default_snippet_for_project()
  from public, anon, authenticated;

drop trigger if exists projects_create_default_snippet on public.projects;
create trigger projects_create_default_snippet
after insert on public.projects
for each row
execute function public.create_default_snippet_for_project();

insert into public.snippets (project_id, name)
select projects.id, 'Snippet principal'
from public.projects
where not exists (
  select 1
  from public.snippets
  where snippets.project_id = projects.id
);

drop trigger if exists snippets_set_updated_at on public.snippets;
create trigger snippets_set_updated_at
before update on public.snippets
for each row
execute function public.set_updated_at();
