-- Adds Epson, Xbox, and Steam Deck to sessions.category for existing
-- Supabase projects created before this wave. A brand-new project created
-- from the current supabase/schema.sql already includes these — this file
-- is only for projects set up before that. Safe to re-run; changes only
-- the allowed values of sessions.category, no rows are deleted or rewritten.
--
-- If you haven't yet run supabase/ps5-owner-validation.sql, run that first
-- (or instead of this) — this file's constraint already includes 'ps5' too,
-- so running this alone also covers that gap for a project that skipped it.
alter table sessions drop constraint if exists sessions_category_check;
alter table sessions add constraint sessions_category_check
  check (category in ('switch', 'gopro', 'dji', 'camera', 'ps5', 'epson', 'xbox', 'steamdeck'));
