create table public.analytics_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  event_type text not null
    check (event_type in (
      'widget_loaded',
      'chat_opened',
      'message_requested',
      'message_succeeded',
      'message_failed'
    )),
  outcome text not null default 'success'
    check (outcome in ('success', 'failure', 'skipped', 'blocked')),
  project_id uuid references public.projects(id) on delete set null,
  snippet_id uuid references public.snippets(id) on delete set null,
  session_hash text check (session_hash is null or char_length(session_hash) = 64),
  ip_hash text check (ip_hash is null or char_length(ip_hash) = 64),
  origin_hostname text check (
    origin_hostname is null or char_length(origin_hostname) <= 253
  ),
  country_code text check (
    country_code is null or country_code ~ '^[A-Z]{2}$'
  ),
  browser_name text check (
    browser_name is null or char_length(browser_name) <= 80
  ),
  os_name text check (os_name is null or char_length(os_name) <= 80),
  device_type text check (
    device_type is null or char_length(device_type) <= 40
  ),
  is_bot boolean not null default false,
  status_code integer check (
    status_code is null or status_code between 100 and 599
  ),
  duration_ms integer check (
    duration_ms is null or duration_ms between 0 and 300000
  ),
  request_id text check (
    request_id is null or char_length(request_id) <= 160
  )
);

create index analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at desc);
create index analytics_events_project_occurred_idx
  on public.analytics_events (project_id, occurred_at desc);
create index analytics_events_snippet_occurred_idx
  on public.analytics_events (snippet_id, occurred_at desc);
create index analytics_events_type_occurred_idx
  on public.analytics_events (event_type, occurred_at desc);
create index analytics_events_session_occurred_idx
  on public.analytics_events (session_hash, occurred_at desc)
  where session_hash is not null;

alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from public, anon, authenticated;
revoke all on sequence public.analytics_events_id_seq
  from public, anon, authenticated;

comment on table public.analytics_events is
  'Telemetria anonimizada do widget. Não armazena conteúdo de conversas, IP ou user-agent bruto.';

create table public.security_audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  event_type text not null
    check (event_type in (
      'auth.login_succeeded',
      'auth.login_failed',
      'auth.access_denied',
      'auth.logout',
      'security.rate_limited',
      'project.created',
      'project.updated',
      'project.deleted',
      'snippet.created',
      'snippet.updated',
      'snippet.duplicated',
      'snippet.deleted'
    )),
  outcome text not null
    check (outcome in ('success', 'failure', 'denied', 'blocked')),
  actor_user_id uuid,
  subject_hash text check (
    subject_hash is null or char_length(subject_hash) = 64
  ),
  resource_type text check (
    resource_type is null or resource_type in ('auth', 'project', 'snippet', 'api')
  ),
  resource_id uuid,
  ip_hash text check (ip_hash is null or char_length(ip_hash) = 64),
  country_code text check (
    country_code is null or country_code ~ '^[A-Z]{2}$'
  ),
  browser_name text check (
    browser_name is null or char_length(browser_name) <= 80
  ),
  os_name text check (os_name is null or char_length(os_name) <= 80),
  device_type text check (
    device_type is null or char_length(device_type) <= 40
  ),
  request_id text check (
    request_id is null or char_length(request_id) <= 160
  ),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object')
);

create index security_audit_events_occurred_at_idx
  on public.security_audit_events (occurred_at desc);
create index security_audit_events_type_occurred_idx
  on public.security_audit_events (event_type, occurred_at desc);
create index security_audit_events_actor_occurred_idx
  on public.security_audit_events (actor_user_id, occurred_at desc)
  where actor_user_id is not null;
create index security_audit_events_outcome_occurred_idx
  on public.security_audit_events (outcome, occurred_at desc);

alter table public.security_audit_events enable row level security;
revoke all on table public.security_audit_events
  from public, anon, authenticated;
revoke all on sequence public.security_audit_events_id_seq
  from public, anon, authenticated;

comment on table public.security_audit_events is
  'Trilha administrativa e de autenticação com identificadores sensíveis anonimizados.';

create table public.rate_limit_windows (
  scope text not null check (char_length(scope) between 1 and 80),
  key_hash text not null check (char_length(key_hash) = 64),
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (scope, key_hash, window_started_at)
);

create index rate_limit_windows_expires_at_idx
  on public.rate_limit_windows (expires_at);

alter table public.rate_limit_windows enable row level security;
revoke all on table public.rate_limit_windows from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_window_started_at timestamptz,
  p_expires_at timestamptz,
  p_max_requests integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_count integer;
begin
  if
    char_length(p_scope) not between 1 and 80
    or char_length(p_key_hash) <> 64
    or p_max_requests < 1
    or p_expires_at <= p_window_started_at
  then
    return false;
  end if;

  insert into public.rate_limit_windows (
    scope,
    key_hash,
    window_started_at,
    expires_at,
    request_count
  )
  values (
    p_scope,
    p_key_hash,
    p_window_started_at,
    p_expires_at,
    1
  )
  on conflict (scope, key_hash, window_started_at)
  do update
    set request_count = public.rate_limit_windows.request_count + 1
    where public.rate_limit_windows.request_count < p_max_requests
  returning request_count into current_count;

  return current_count is not null and current_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_rate_limit(
  text,
  text,
  timestamptz,
  timestamptz,
  integer
) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(
  text,
  text,
  timestamptz,
  timestamptz,
  integer
) to service_role;

create or replace function public.get_observability_summary(
  p_since timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped as (
    select *
    from public.analytics_events
    where occurred_at >= p_since
      and is_bot = false
  ),
  totals as (
    select
      count(*) filter (where event_type = 'widget_loaded') as widget_loads,
      count(distinct session_hash)
        filter (where session_hash is not null) as unique_sessions,
      count(*) filter (where event_type = 'chat_opened') as chat_opens,
      count(*) filter (where event_type = 'message_requested') as messages,
      count(*) filter (where event_type = 'message_succeeded') as successes,
      count(*) filter (where event_type = 'message_failed') as failures,
      coalesce(
        round(avg(duration_ms)
          filter (where event_type in ('message_succeeded', 'message_failed'))),
        0
      ) as avg_duration_ms
    from scoped
  )
  select jsonb_build_object(
    'widgetLoads', widget_loads,
    'uniqueSessions', unique_sessions,
    'chatOpens', chat_opens,
    'messages', messages,
    'successes', successes,
    'failures', failures,
    'successRate',
      case
        when successes + failures = 0 then 0
        else round((successes::numeric * 100) / (successes + failures), 1)
      end,
    'avgDurationMs', avg_duration_ms,
    'operatingSystems', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', count))
      from (
        select coalesce(os_name, 'Desconhecido') as name, count(*) as count
        from scoped
        where event_type = 'widget_loaded'
        group by 1
        order by 2 desc
        limit 8
      ) values_by_os
    ), '[]'::jsonb),
    'browsers', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', count))
      from (
        select coalesce(browser_name, 'Desconhecido') as name, count(*) as count
        from scoped
        where event_type = 'widget_loaded'
        group by 1
        order by 2 desc
        limit 8
      ) values_by_browser
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', count))
      from (
        select coalesce(device_type, 'desktop') as name, count(*) as count
        from scoped
        where event_type = 'widget_loaded'
        group by 1
        order by 2 desc
        limit 8
      ) values_by_device
    ), '[]'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', count))
      from (
        select coalesce(country_code, '--') as name, count(*) as count
        from scoped
        where event_type = 'widget_loaded'
        group by 1
        order by 2 desc
        limit 8
      ) values_by_country
    ), '[]'::jsonb),
    'origins', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', count))
      from (
        select coalesce(origin_hostname, 'Direto') as name, count(*) as count
        from scoped
        where event_type = 'widget_loaded'
        group by 1
        order by 2 desc
        limit 8
      ) values_by_origin
    ), '[]'::jsonb)
  )
  from totals;
$$;

revoke all on function public.get_observability_summary(timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_observability_summary(timestamptz)
  to service_role;

create or replace function public.cleanup_observability_events()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.analytics_events
  where occurred_at < now() - interval '90 days';

  delete from public.security_audit_events
  where occurred_at < now() - interval '90 days';

  delete from public.rate_limit_windows
  where expires_at < now();
end;
$$;

revoke all on function public.cleanup_observability_events()
  from public, anon, authenticated;
grant execute on function public.cleanup_observability_events()
  to service_role;

create extension if not exists pg_cron;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'cleanup-observability-events';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'cleanup-observability-events',
    '17 3 * * *',
    $command$select public.cleanup_observability_events();$command$
  );
end;
$$;
