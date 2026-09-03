-- Launch + Revenue + Feedback Operating System wave. Purely additive — no
-- existing column, constraint, or row is touched. Run once in the Supabase
-- SQL Editor, same as the other supabase/add-*.sql files.

-- CHARGEABLE-RESULT DISTINCTION. Separates "the evaluator legitimately
-- returned a structured result, even if INCONCLUSIVE because the evidence
-- itself was weak" (chargeable) from "TestPass's own evaluator infra
-- failed and INCONCLUSIVE is standing in for that failure" (never
-- chargeable). Previously this only existed transiently as `technicalError`
-- in the evaluation_result event's metadata — not on the evidence row
-- itself, so nothing that runs at checkout time could see it. Does NOT
-- change DEMONSTRATED / FAILED / INCONCLUSIVE verdict semantics — verdict
-- stays exactly what the evaluator decided; this is a separate, orthogonal
-- flag read by the checkout route only.
alter table evidence add column if not exists technical_error boolean not null default false;

-- COHORT TAGGING. Server/admin-set only — never client-supplied, never a
-- public coupon field (src/app/api/sessions/create/route.ts only sets this
-- from a private query param matched against QA_COHORT_SECRET). Lets
-- revenue/funnel/PMF reporting exclude compensated physical-QA participants
-- from genuine willingness-to-pay signal without deleting or hiding their
-- rows. null/'genuine' = ordinary buyer, unlabeled by default.
alter table sessions add column if not exists cohort text;

-- MINIMAL FEEDBACK SYSTEM. One table for seller/buyer micro-feedback AND
-- report-a-problem submissions (stage='report_problem') — deliberately not
-- a separate table; this is meant to stay small. No PII beyond whatever
-- free text someone chooses to type.
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  session_id text references sessions(id) on delete set null,
  actor text not null check (actor in ('buyer', 'seller')),
  category text,
  stage text not null,
  rating text,
  free_text text,
  page text,
  cohort text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_session_idx on feedback(session_id);
create index if not exists feedback_stage_idx on feedback(stage);

alter table feedback enable row level security;
-- No policies — service_role only, same access pattern as sessions/evidence/events.

grant select, insert, update, delete on public.feedback to service_role;
