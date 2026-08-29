import { notFound } from "next/navigation";
import { getSession } from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import SessionStatus from "@/components/buyer/SessionStatus";

// A thin, bookmarkable/shareable wrapper around the same live SessionStatus
// component NewSessionForm renders inline right after a buyer creates a
// test — this route exists so a direct link still works (e.g. opened on a
// different device, or saved for later), not as the only way to see a
// result.
export default async function BuyerSessionPage(props: PageProps<"/buyer/session/[id]">) {
  const { id } = await props.params;

  let session;
  try {
    session = await getSession(id);
  } catch {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold">TestPass isn&apos;t fully set up yet</h1>
        <p className="mt-3 text-foreground/60">
          Connect Supabase (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) and run supabase/schema.sql.
        </p>
      </div>
    );
  }

  if (!session) notFound();

  const config = CATEGORY_CONFIG[session.category];

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        TestPass · {config.label}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Your test result</h1>
      <SessionStatus sessionId={id} />
    </div>
  );
}
