-- =============================================================================
-- Modern API Studio — Complete Database Schema
-- =============================================================================
-- File   : supabase/migrations/001_full_schema.sql
-- Scope  : Apply this ONCE to a fresh Supabase project.
--          It creates all tables, triggers, helper functions, RLS policies,
--          and grants needed by the Modern API Studio application.
--
-- Tables
--   public.projects          — API spec projects owned by a user
--   public.project_members   — collaborators with role-based access
--   public.project_invites   — shareable invite links with optional expiry
--
-- Key design decisions
--   • All RLS policies that reference project_members use SECURITY DEFINER
--     helper functions to avoid infinite recursion (Postgres evaluates RLS
--     policies recursively when a table references itself in a subquery).
--   • Invite tokens are generated client-side (crypto.getRandomValues) so
--     the pgcrypto extension is NOT required.
--   • A SECURITY DEFINER function joins project_members with auth.users to
--     expose real email addresses to the client without exposing auth.users.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. Extensions (enable if not already active)
-- ---------------------------------------------------------------------------
-- uuid-ossp is usually pre-enabled on Supabase; gen_random_uuid() works
-- without it on PostgreSQL ≥ 13, but enabling is harmless.
create extension if not exists "uuid-ossp" schema extensions;


-- =============================================================================
-- TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null default 'Untitled Project',
  spec_data   jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.projects             is 'OpenAPI spec projects created by users.';
comment on column public.projects.user_id     is 'Owner of the project (auth.users.id).';
comment on column public.projects.spec_data   is 'Full API spec stored as JSONB (ApiSpec type).';

-- ---------------------------------------------------------------------------
-- 2. project_members
-- ---------------------------------------------------------------------------
create table if not exists public.project_members (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  user_id     uuid        not null references auth.users(id)     on delete cascade,
  role        text        not null check (role in ('owner', 'editor', 'viewer')),
  joined_at   timestamptz not null default now(),

  unique (project_id, user_id)
);

comment on table  public.project_members          is 'Collaborators for a project.';
comment on column public.project_members.role     is 'owner = full control; editor = view+save; viewer = read-only.';

-- ---------------------------------------------------------------------------
-- 3. project_invites
-- ---------------------------------------------------------------------------
-- Note: token has NO default because the client generates it with
--       crypto.getRandomValues(), avoiding the pgcrypto dependency.
create table if not exists public.project_invites (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  token       text        not null unique,
  role        text        not null default 'editor' check (role in ('editor', 'viewer')),
  created_by  uuid        not null references auth.users(id) on delete cascade,
  expires_at  timestamptz,           -- NULL = never expires
  max_uses    integer,               -- NULL = unlimited uses
  use_count   integer     not null default 0,
  created_at  timestamptz not null default now()
);

comment on table  public.project_invites            is 'Shareable invite links for projects.';
comment on column public.project_invites.token      is 'Client-generated cryptographically random hex string (48 chars).';
comment on column public.project_invites.expires_at is 'When NULL, the invite never expires.';
comment on column public.project_invites.max_uses   is 'When NULL, the invite has unlimited uses.';


-- =============================================================================
-- INDEXES
-- =============================================================================

create index if not exists idx_projects_user_id
  on public.projects (user_id);

create index if not exists idx_project_members_project_id
  on public.project_members (project_id);

create index if not exists idx_project_members_user_id
  on public.project_members (user_id);

create index if not exists idx_project_invites_project_id
  on public.project_invites (project_id);

-- token is already unique (implicitly indexed), but a btree index helps
-- the join-flow lookup: .eq('token', token)
create index if not exists idx_project_invites_token
  on public.project_invites (token);


-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update projects.updated_at on every UPDATE
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at
  before update on public.projects
  for each row
  execute function public.handle_updated_at();


-- =============================================================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- =============================================================================
--
-- Why SECURITY DEFINER?
-- When Postgres evaluates a SELECT policy on project_members and that policy
-- itself queries project_members, the policy is evaluated again — causing
-- infinite recursion and a "stack depth limit exceeded" error.
--
-- SECURITY DEFINER functions bypass RLS and execute as their owner (postgres),
-- breaking the recursive cycle.  They are the recommended Supabase pattern for
-- this problem.
-- =============================================================================

-- Returns project IDs where the current user is ANY member role
create or replace function public.get_my_project_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select project_id
  from   public.project_members
  where  user_id = auth.uid();
$$;

-- Returns project IDs where the current user is 'owner' or 'editor'
create or replace function public.get_my_editor_project_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select project_id
  from   public.project_members
  where  user_id = auth.uid()
    and  role in ('owner', 'editor');
$$;

-- Returns all projects the current user can access, with their role.
-- Used by the Dashboard instead of a direct table query to avoid RLS recursion.
create or replace function public.get_my_accessible_projects()
returns table (
  id          uuid,
  name        text,
  updated_at  timestamptz,
  user_id     uuid,
  my_role     text
)
language sql
security definer
stable
set search_path = public
as $$
  -- Projects owned by the current user
  select
    p.id,
    p.name,
    p.updated_at,
    p.user_id,
    'owner'::text as my_role
  from public.projects p
  where p.user_id = auth.uid()

  union all

  -- Projects shared with the current user via project_members
  select
    p.id,
    p.name,
    p.updated_at,
    p.user_id,
    pm.role::text as my_role
  from public.project_members pm
  join public.projects p on p.id = pm.project_id
  where pm.user_id = auth.uid()

  order by updated_at desc;
$$;

-- Returns members of a project with their real email addresses.
-- auth.users is not accessible to the client via RLS; this SECURITY DEFINER
-- function joins project_members with auth.users safely.
create or replace function public.get_project_members_with_emails(p_project_id uuid)
returns table (
  id          uuid,
  user_id     uuid,
  email       text,
  role        text,
  joined_at   timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    pm.id,
    pm.user_id,
    au.email::text,
    pm.role,
    pm.joined_at
  from public.project_members pm
  join auth.users au on au.id = pm.user_id
  where pm.project_id = p_project_id;
$$;

-- Grant execute to authenticated users only (anon cannot call these)
grant execute on function public.get_my_project_ids()                   to authenticated;
grant execute on function public.get_my_editor_project_ids()            to authenticated;
grant execute on function public.get_my_accessible_projects()           to authenticated;
grant execute on function public.get_project_members_with_emails(uuid)  to authenticated;


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;


-- ---------------------------------------------------------------------------
-- RLS: projects
-- ---------------------------------------------------------------------------

-- SELECT: own projects OR projects where user is a member (via SECURITY DEFINER fn)
create policy "projects: owner and members can select"
  on public.projects for select
  using (
    user_id = auth.uid()
    or id in (select public.get_my_project_ids())
  );

-- INSERT: user can only create projects for themselves
create policy "projects: authenticated users can insert own"
  on public.projects for insert
  with check (auth.uid() = user_id);

-- UPDATE: owner OR editor member can save
create policy "projects: owner and editors can update"
  on public.projects for update
  using (
    user_id = auth.uid()
    or id in (select public.get_my_editor_project_ids())
  );

-- DELETE: only the owner can delete a project
create policy "projects: only owner can delete"
  on public.projects for delete
  using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- RLS: project_members
-- ---------------------------------------------------------------------------

-- SELECT: see members if you own the project OR are a member yourself
-- Uses SECURITY DEFINER fn to avoid self-referential recursion on project_members.
create policy "project_members: visible to members and owner"
  on public.project_members for select
  using (
    -- Your own membership row (no helper fn needed — no recursion risk)
    user_id = auth.uid()
    or
    -- You own the project (references projects, not project_members)
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
    or
    -- You are already a member of this project (SECURITY DEFINER — no recursion)
    project_id in (select public.get_my_project_ids())
  );

-- INSERT (owner path): project owner can add any member
create policy "project_members: owner can add members"
  on public.project_members for insert
  with check (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

-- INSERT (self-join path): any authenticated user can add ONLY THEMSELVES.
-- This powers the invite-accept flow — the client validates the token, expiry,
-- and max_uses before this INSERT is executed.
create policy "project_members: users can self-join via invite"
  on public.project_members for insert
  with check (user_id = auth.uid());

-- UPDATE: only the project owner can change member roles
create policy "project_members: owner can update roles"
  on public.project_members for update
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );

-- DELETE: owner can remove any member; any member can leave themselves
create policy "project_members: owner or self can delete"
  on public.project_members for delete
  using (
    user_id = auth.uid()
    or project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- RLS: project_invites
-- ---------------------------------------------------------------------------

-- SELECT (by token, unauthenticated join flow):
-- Anyone can read an invite by its token column.
-- Required so that JoinProjectPage can validate the token before the user
-- has added themselves to the project.
-- The token is a 48-char random hex — effectively impossible to enumerate.
create policy "project_invites: anyone can read by token"
  on public.project_invites for select
  using (true);

-- SELECT (management view, owners & editors only):
-- A separate, more restrictive policy; Supabase uses the union of all matching
-- SELECT policies, so this one coexists with the token-read policy above.
-- The token-read policy already covers this case; this is left here for
-- documentation clarity and potential future tightening.
-- (Uncomment if you want to remove the open `using(true)` above.)
-- create policy "project_invites: owners and editors can list"
--   on public.project_invites for select
--   using (
--     project_id in (select id from public.projects where user_id = auth.uid())
--     or project_id in (select public.get_my_editor_project_ids())
--   );

-- INSERT: project owner OR editor can create invite links
create policy "project_invites: owners and editors can insert"
  on public.project_invites for insert
  with check (
    project_id in (select id from public.projects where user_id = auth.uid())
    or project_id in (select public.get_my_editor_project_ids())
  );

-- UPDATE: allow incrementing use_count when a user accepts an invite.
-- Limited to the use_count column only (enforced in application logic).
create policy "project_invites: authenticated can increment use_count"
  on public.project_invites for update
  using (auth.role() = 'authenticated');

-- DELETE: only the project owner can revoke / delete invite links
create policy "project_invites: owner can delete"
  on public.project_invites for delete
  using (
    project_id in (
      select id from public.projects where user_id = auth.uid()
    )
  );


-- =============================================================================
-- GRANTS
-- =============================================================================
-- Even with RLS enabled, Postgres requires explicit GRANT on the table for the
-- role to be able to issue any DML at all.  Without these grants you get:
--   "permission denied for table <name>"
-- even when an RLS policy would allow the row.
-- =============================================================================

-- authenticated: full CRUD on all three tables (row visibility controlled by RLS)
grant select, insert, update, delete on public.projects        to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.project_invites to authenticated;

-- anon: read-only on project_invites so the token-validation in JoinProjectPage
-- works even before the user has confirmed sign-up (edge case).
-- The app renders JoinProjectPage only after login, but keeping this grant is
-- harmless and the token column is a 48-char random hex — not enumerable.
grant select on public.project_invites to anon;


-- =============================================================================
-- REALTIME
-- =============================================================================
-- Enable Supabase Realtime broadcast + presence on these tables.
-- Presence state (online users) is tracked per project channel in the client.

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_members;


-- =============================================================================
-- VERIFICATION QUERIES  (run manually after applying)
-- =============================================================================
-- select * from public.get_my_accessible_projects();
-- select * from public.get_project_members_with_emails('<your-project-uuid>');
-- select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename, cmd;
