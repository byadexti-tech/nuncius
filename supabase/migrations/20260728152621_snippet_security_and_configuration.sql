alter table public.snippets
  add column if not exists is_active boolean not null default true,
  add column if not exists origin_policy text not null default 'allow_all'
    check (origin_policy in ('allow_all', 'allowlist')),
  add column if not exists allowed_origins text[] not null default '{}';

alter table public.snippets
  add constraint snippets_active_allowlist_check
  check (not is_active or origin_policy = 'allow_all' or cardinality(allowed_origins) > 0);

alter table public.snippets
  add constraint snippets_allowed_origins_limit_check
  check (cardinality(allowed_origins) <= 20);

comment on column public.snippets.is_active is
  'Define se o widget pode carregar e enviar mensagens.';
comment on column public.snippets.origin_policy is
  'allow_all para instalações legadas; allowlist exige origens exatas.';
comment on column public.snippets.allowed_origins is
  'Origens normalizadas scheme://host[:port] autorizadas a carregar o widget.';

alter table public.security_audit_events
  drop constraint if exists security_audit_events_event_type_check;

alter table public.security_audit_events
  add constraint security_audit_events_event_type_check
  check (event_type in (
    'auth.login_succeeded', 'auth.login_failed', 'auth.access_denied', 'auth.logout',
    'security.rate_limited', 'project.created', 'project.updated', 'project.deleted',
    'snippet.created', 'snippet.updated', 'snippet.duplicated', 'snippet.deleted',
    'snippet.activated', 'snippet.deactivated', 'snippet.origins_updated',
    'project.webhook_updated', 'project.webhook_tested',
    'organization.created', 'membership.invited', 'membership.updated',
    'membership.removed', 'agency.client_linked', 'agency.client_revoked'
  ));
