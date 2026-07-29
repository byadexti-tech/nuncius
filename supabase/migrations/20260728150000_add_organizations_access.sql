create schema if not exists private;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  type text not null check (type in ('individual', 'company', 'agency')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer', 'billing')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create unique index if not exists organization_one_active_owner_idx
  on public.organization_memberships (organization_id)
  where role = 'owner' and status = 'active';

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (char_length(email) between 3 and 320),
  role text not null check (role in ('admin', 'editor', 'viewer', 'billing')),
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled', 'expired')),
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists organization_pending_invite_email_idx
  on public.organization_invitations (organization_id, lower(email))
  where status = 'pending';

create table if not exists public.agency_client_access (
  agency_organization_id uuid not null references public.organizations(id) on delete cascade,
  client_organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (agency_organization_id, client_organization_id),
  check (agency_organization_id <> client_organization_id)
);

create index if not exists organization_memberships_user_idx
  on public.organization_memberships (user_id, status);
create index if not exists organization_invitations_org_idx
  on public.organization_invitations (organization_id, status, expires_at);
create index if not exists agency_client_access_client_idx
  on public.agency_client_access (client_organization_id, status);

alter table public.projects add column if not exists organization_id uuid;

insert into public.organizations (id, name, type)
values ('00000000-0000-0000-0000-000000000001', 'Nuncius legado', 'company')
on conflict (id) do nothing;

update public.projects
set organization_id = '00000000-0000-0000-0000-000000000001'
where organization_id is null;

alter table public.projects
  alter column organization_id set not null,
  add constraint projects_organization_id_fkey
    foreign key (organization_id) references public.organizations(id) on delete cascade;

create index if not exists projects_organization_id_idx
  on public.projects (organization_id, created_at desc);

insert into public.organization_memberships (organization_id, user_id, role)
select
  '00000000-0000-0000-0000-000000000001',
  id,
  case when row_number() over (order by created_at, id) = 1 then 'owner' else 'admin' end
from auth.users
where raw_app_meta_data ->> 'role' = 'admin'
on conflict (organization_id, user_id) do update
set role = excluded.role, status = 'active', updated_at = now();

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = p_organization_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function private.has_org_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1 from public.organization_memberships
    where organization_id = p_organization_id
      and user_id = (select auth.uid())
      and status = 'active'
      and role = any(p_roles)
  );
$$;

create or replace function private.can_access_client(p_client_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select private.is_org_member(p_client_organization_id)
    or exists (
      select 1
      from public.agency_client_access a
      join public.organization_memberships m
        on m.organization_id = a.agency_organization_id
       and m.user_id = (select auth.uid())
       and m.status = 'active'
      where a.client_organization_id = p_client_organization_id
        and a.status = 'active'
    );
$$;

revoke all on schema private from public;
revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;
grant execute on function private.can_access_client(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.agency_client_access enable row level security;

drop policy if exists organizations_member_select on public.organizations;
create policy organizations_member_select on public.organizations
  for select to authenticated
  using (private.can_access_client(id));

drop policy if exists memberships_member_select on public.organization_memberships;
create policy memberships_member_select on public.organization_memberships
  for select to authenticated
  using (private.is_org_member(organization_id));

drop policy if exists invitations_admin_select on public.organization_invitations;
create policy invitations_admin_select on public.organization_invitations
  for select to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']));

drop policy if exists agency_access_member_select on public.agency_client_access;
create policy agency_access_member_select on public.agency_client_access
  for select to authenticated
  using (
    private.is_org_member(agency_organization_id)
    or private.is_org_member(client_organization_id)
  );

drop policy if exists projects_member_select on public.projects;
create policy projects_member_select on public.projects
  for select to authenticated
  using (private.can_access_client(organization_id));

drop policy if exists projects_editor_insert on public.projects;
create policy projects_editor_insert on public.projects
  for insert to authenticated
  with check (private.has_org_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists projects_editor_update on public.projects;
create policy projects_editor_update on public.projects
  for update to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin', 'editor']))
  with check (private.has_org_role(organization_id, array['owner', 'admin', 'editor']));

drop policy if exists projects_admin_delete on public.projects;
create policy projects_admin_delete on public.projects
  for delete to authenticated
  using (private.has_org_role(organization_id, array['owner', 'admin']));

drop policy if exists snippets_member_select on public.snippets;
create policy snippets_member_select on public.snippets
  for select to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = snippets.project_id and private.can_access_client(p.organization_id)
  ));

drop policy if exists snippets_editor_insert on public.snippets;
create policy snippets_editor_insert on public.snippets
  for insert to authenticated
  with check (exists (
    select 1 from public.projects p
    where p.id = snippets.project_id
      and private.has_org_role(p.organization_id, array['owner', 'admin', 'editor'])
  ));

drop policy if exists snippets_editor_update on public.snippets;
create policy snippets_editor_update on public.snippets
  for update to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = snippets.project_id
      and private.has_org_role(p.organization_id, array['owner', 'admin', 'editor'])
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = snippets.project_id
      and private.has_org_role(p.organization_id, array['owner', 'admin', 'editor'])
  ));

drop policy if exists snippets_admin_delete on public.snippets;
create policy snippets_admin_delete on public.snippets
  for delete to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = snippets.project_id
      and private.has_org_role(p.organization_id, array['owner', 'admin'])
  ));

alter table public.organizations force row level security;
alter table public.organization_memberships force row level security;
alter table public.organization_invitations force row level security;
alter table public.agency_client_access force row level security;
alter table public.projects force row level security;
alter table public.snippets force row level security;

grant select on public.organizations to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.organization_invitations to authenticated;
grant select on public.agency_client_access to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.snippets to authenticated;

comment on table public.organizations is 'Nuncius tenants: individual, company or agency.';
comment on table public.organization_memberships is 'User roles scoped to an organization.';
comment on table public.agency_client_access is 'Delegated agency access to separate client organizations.';

alter table public.security_audit_events
  drop constraint if exists security_audit_events_event_type_check;
alter table public.security_audit_events
  add constraint security_audit_events_event_type_check check (event_type in (
    'auth.login_succeeded', 'auth.login_failed', 'auth.access_denied', 'auth.logout',
    'security.rate_limited', 'project.created', 'project.updated', 'project.deleted',
    'snippet.created', 'snippet.updated', 'snippet.duplicated', 'snippet.deleted',
    'organization.created', 'membership.invited', 'membership.updated', 'membership.removed',
    'agency.client_linked', 'agency.client_revoked'
  ));

alter table public.security_audit_events
  drop constraint if exists security_audit_events_resource_type_check;
alter table public.security_audit_events
  add constraint security_audit_events_resource_type_check check (
    resource_type is null or resource_type in (
      'auth', 'project', 'snippet', 'api', 'organization', 'membership', 'invitation', 'agency_access'
    )
  );
