-- Adds Meta Quest and Synology NAS to sessions.category for existing
-- Supabase projects created before this wave. A brand-new project created
-- from the current supabase/schema.sql already includes these — this file
-- is only for projects set up before that. Safe to re-run; changes only
-- the allowed values of sessions.category, no rows are deleted or rewritten.
--
-- Includes every category shipped so far (not just the two new ones) so
-- this file alone brings an older project fully current, the same way
-- add-epson-xbox-steamdeck.sql did for its wave.
alter table sessions drop constraint if exists sessions_category_check;
alter table sessions add constraint sessions_category_check
  check (category in ('switch', 'gopro', 'dji', 'camera', 'ps5', 'epson', 'xbox', 'steamdeck', 'quest', 'nas'));
