-- Beta measurement-integrity fix: Preview and Production point at the same
-- Supabase project (no separate staging database), so every Preview test
-- session/event lands in the exact tables the private-beta funnel numbers
-- will be computed from. This column lets funnel queries exclude
-- non-production activity without needing a second database.
--
-- Purely additive, safe to re-run, same convention as the other
-- supabase/add-*.sql files. Run this once in the Supabase SQL Editor.
--
-- Populated server-side only, from Vercel's own VERCEL_ENV system env var
-- (see createSession in src/lib/db.ts) — never client-supplied, so it can't
-- be spoofed by a request. Values: "production" | "preview" | "development".
--
-- Existing rows predate this column and are left NULL on purpose. NULL is
-- not "production", so the simplest correct beta-baseline query is:
--   select * from sessions where environment = 'production';
-- which automatically excludes both the pre-migration rows and any future
-- Preview/dev activity, with no manual classification or backfill needed.
-- (Do not bulk-delete the pre-migration rows — they have not been verified
-- to all be synthetic.)
alter table sessions add column if not exists environment text;

create index if not exists sessions_environment_idx on sessions(environment);
