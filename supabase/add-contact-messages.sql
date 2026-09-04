-- TestPass Contact/Support system.
--
-- One small table for every inbound contact/support message, whether or
-- not it's tied to a TestPass session -- session_id is nullable so a
-- general "I have a question before using this" or "partnership idea"
-- message has a home too, rather than being forced into the product
-- feedback table's session-shaped semantics.
--
-- No public access: RLS is enabled with no policies at all defined here,
-- so only the service-role key (used exclusively by
-- src/app/api/contact/route.ts, via getSupabaseAdmin()) can read or write
-- this table. A client can never fetch a list of other people's contact
-- messages -- same posture as the `feedback` table in
-- add-launch-operating-fields.sql.
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
      reason text not null check (reason in ('problem', 'question', 'feedback', 'other')),
        reply_email text,
          message text not null,
            session_id text references sessions(id) on delete set null,
              category text,
                actor text check (actor in ('buyer', 'seller', 'visitor')),
                  stage text,
                    page_path text,
                      status text not null default 'new'
                      );

                      create index if not exists contact_messages_session_idx on contact_messages(session_id);
                      create index if not exists contact_messages_created_idx on contact_messages(created_at);

                      alter table contact_messages enable row level security;
                      grant select, insert, update, delete on public.contact_messages to service_role;
                      
