-- PS5 owner-validation experiment migration.
-- Run this in Supabase SQL Editor only after you decide to deploy the experiment branch.
-- It changes only the allowed values of sessions.category; no rows are deleted or rewritten.
alter table sessions drop constraint if exists sessions_category_check;
alter table sessions add constraint sessions_category_check
  check (category in ('switch', 'gopro', 'dji', 'camera', 'ps5'));
