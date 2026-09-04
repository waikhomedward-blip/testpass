import Link from "next/link";

// Section 26's "Report a problem" affordance, now routed into the unified
// Contact system (/contact) instead of a separate inline form -- one
// coherent support pipeline rather than two disconnected mechanisms.
// Prefills reason=problem and carries session/actor/page as query params;
// /contact's server-side handler resolves category and stage itself from
// the real session row, so there's no client-supplied `stage` to pass
// through anymore.
export default function ReportProblem({
    sessionId,
    actor,
    page,
}: {
    sessionId?: string;
    actor: "buyer" | "seller";
    page: string;
}) {
    const params = new URLSearchParams({ reason: "problem", actor, page });
    if (sessionId) params.set("session", sessionId);

  return (
        <Link
                href={`/contact?${params.toString()}`}
                className="text-xs text-ink-secondary underline decoration-dotted underline-offset-2 hover:text-signal"
              >
              Report a problem
        </Link>
      );
}
