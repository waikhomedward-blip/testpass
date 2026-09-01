-- TestPass V1 schema.
-- Run this once in the Supabase SQL Editor for your project
-- (Project → SQL Editor → New query → paste → Run).
--
-- All application access goes through the server using the service_role
-- key (see src/lib/supabase/server.ts), which bypasses RLS by design —
-- the browser never talks to Supabase directly. RLS is still enabled below
-- as defense in depth in case the anon key is ever exposed client-side.

create extension if not exists pgcrypto;

create table if not exists sessions (
  id text primary key,
  category text not null
    check (category in ('switch', 'gopro', 'dji', 'camera', 'ps5', 'epson', 'xbox', 'steamdeck', 'quest', 'nas', 'printer3d', 'projector', 'rogally')),
  model text,
  listing_url text,
  listing_notes text,
  status text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED', 'IN_PROGRESS', 'ABANDONED', 'INCOMPLETE', 'COMPLETED')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz not null,
  unlocked boolean not null default true
);

create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references sessions(id) on delete cascade,
  function_tested text not null,
  primitive_level text not null,
  capability_label text not null
    check (capability_label in ('CONFIRMED', 'MODEL-DEPENDENT', 'EXPERIMENTAL', 'UNAVAILABLE')),
  verdict text not null check (verdict in ('DEMONSTRATED', 'FAILED', 'INCONCLUSIVE')),
  reasoning text not null,
  association_strength text
    check (association_strength in ('STRONG', 'MODERATE', 'WEAK', 'INCONCLUSIVE')),
  raw_data jsonb,
  -- Storage paths (in the `captures` bucket) for every image submitted with
  -- this evidence, so the buyer's results page can show what the seller
  -- actually captured, not just the verdict. [{"path": "...", "filename": "..."}]
  image_paths jsonb,
  -- Optional one-sentence, purely descriptive note about the physical
  -- device's visible cosmetic condition, from the product-photo step. Never
  -- influences verdict or association_strength — see PRODUCT_PHOTO_ADDENDUM
  -- in src/lib/primitives.ts.
  cosmetic_note text,
  created_at timestamptz not null default now()
);

create index if not exists evidence_session_id_idx on evidence(session_id);

alter table sessions enable row level security;
alter table evidence enable row level security;
-- No policies are defined — only the service_role key (used server-side
-- only) can read/write. That key bypasses RLS entirely.

-- Storage bucket for raw capture artifacts (photos/frames). Private by
-- default; short retention is enforced by your own cleanup job, not by
-- Supabase — see the retention note in README.md.
insert into storage.buckets (id, name, public)
values ('captures', 'captures', false)
on conflict (id) do nothing;

-- Some Supabase projects don't auto-grant table privileges to service_role
-- on newly created tables (you'll see a Postgres "permission denied" /
-- code 42501 error from the app if this step is missing). service_role
-- already bypasses RLS by design (see the note at the top of this file) —
-- these grants are the separate, lower-level table-privilege layer that
-- RLS bypass doesn't substitute for.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.sessions to service_role;
grant select, insert, update, delete on public.evidence to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

-- Migration for projects that already ran an earlier version of this file
-- (before image_paths / cosmetic_note existed on evidence). Safe to
-- re-run — both are no-ops if the columns are already there.
alter table evidence add column if not exists image_paths jsonb;
alter table evidence add column if not exists cosmetic_note text;
