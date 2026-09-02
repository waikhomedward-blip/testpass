-- Private Beta Launch Readiness wave: instrumentation + Stripe reconciliation
-- columns. Run this once in the Supabase SQL Editor, same as the other
-- supabase/add-*.sql files. Purely additive — no existing column or
-- constraint is touched, safe to re-run.

-- Append-only funnel/error event log. Service-role-only, same access
-- pattern as sessions/evidence. `dedupe_key` is set (as `${event_type}:
-- ${session_id}`) only for milestone events that must count at most once
-- per session (session_created, seller_opened, seller_started,
-- seller_submitted, evaluation_result, buyer_viewed_result,
-- checkout_started, payment_completed) — the partial unique index below
-- makes a duplicate insert a no-op (unique-violation, swallowed by the
-- caller) instead of inflating a funnel count from a page refresh, a
-- poll tick, or a retried Stripe webhook delivery. `error` events pass no
-- dedupe_key and can repeat freely.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  session_id text references sessions(id) on delete set null,
  event_type text not null,
  metadata jsonb,
  dedupe_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists events_dedupe_key_idx on events(dedupe_key) where dedupe_key is not null;
create index if not exists events_type_idx on events(event_type);
create index if not exists events_session_idx on events(session_id);

alter table events enable row level security;
-- No policies — service_role only, same as sessions/evidence.

grant select, insert, update, delete on public.events to service_role;

-- Stripe reconciliation fields. Nullable — most sessions never see a
-- payment. No separate payments table for V1; two columns is enough to
-- answer "did this buyer actually pay" without querying Stripe by hand.
alter table sessions add column if not exists stripe_checkout_session_id text;
alter table sessions add column if not exists stripe_payment_intent_id text;
