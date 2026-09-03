import { notFound } from "next/navigation";
import { getSession, markSessionStarted, recordEvent } from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { isExpired } from "@/lib/time";
import SwitchFlow from "@/components/seller/SwitchFlow";
import GoProFlow from "@/components/seller/GoProFlow";
import DJIFlow from "@/components/seller/DJIFlow";
import DigicamFlow from "@/components/seller/DigicamFlow";
import PS5Flow from "@/components/seller/PS5Flow";
import EpsonFlow from "@/components/seller/EpsonFlow";
import XboxFlow from "@/components/seller/XboxFlow";
import SteamDeckFlow from "@/components/seller/SteamDeckFlow";
import MetaQuestFlow from "@/components/seller/MetaQuestFlow";
import NASFlow from "@/components/seller/NASFlow";
import Printer3DFlow from "@/components/seller/Printer3DFlow";
import ProjectorFlow from "@/components/seller/ProjectorFlow";
import ROGAllyFlow from "@/components/seller/ROGAllyFlow";

export default async function SellerSessionPage(props: PageProps<"/seller/[id]">) {
  const { id } = await props.params;

  let session;
  try {
    session = await getSession(id);
  } catch {
    return (
      <Shell title="TestPass isn't fully set up yet">
        <p>
          This link works, but the app isn&apos;t connected to a database yet. Ask whoever sent you
          this to finish setting up TestPass.
        </p>
      </Shell>
    );
  }

  if (!session) notFound();

  const config = CATEGORY_CONFIG[session.category];
  const expired = isExpired(session.expires_at);

  if (expired && session.status !== "COMPLETED") {
    return (
      <Shell title="This test link has expired">
        <p>Ask the buyer to send you a new TestPass link.</p>
      </Shell>
    );
  }

  if (session.status === "COMPLETED") {
    return (
      <Shell title="Already submitted — thanks!">
        <p>The buyer has this result. You&apos;re done here.</p>
      </Shell>
    );
  }

  await markSessionStarted(id);
  // The moment the seller's link is opened — distinct from "seller_started"
  // (src/app/api/sessions/[id]/start/route.ts), which fires only once they
  // actually tap into the guided capture, not just load this page.
  await recordEvent({ sessionId: id, eventType: "seller_opened", once: true });

  const roundedSeconds = Math.round(config.estimatedSeconds / 30) * 30;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      {/* Fukasawa's "Without Thought": a seller who's never heard of
          TestPass should answer, at a glance and before reading anything
          else, what/who/how-long/privacy/what-happens-next — then the
          interface should get out of the way so they can just point their
          phone at the device. This block is the whole answer; everything
          below it is the task itself, not more explaining. */}
      <p className="font-mono text-xs font-medium uppercase tracking-wide text-ink-secondary">
        TestPass · {config.label}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">A buyer wants proof this works before they pay</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        About {roundedSeconds} seconds on this phone. No account. No app to install. No passwords or
        personal info — TestPass only collects what this one test needs, and the buyer sees your
        result the moment you submit.
      </p>

      <div className="mt-6">
        {session.category === "switch" && <SwitchFlow sessionId={id} />}
        {session.category === "gopro" && <GoProFlow sessionId={id} />}
        {session.category === "dji" && <DJIFlow sessionId={id} />}
        {session.category === "camera" && <DigicamFlow sessionId={id} />}
        {session.category === "ps5" && <PS5Flow sessionId={id} />}
        {session.category === "epson" && <EpsonFlow sessionId={id} />}
        {session.category === "xbox" && <XboxFlow sessionId={id} />}
        {session.category === "steamdeck" && <SteamDeckFlow sessionId={id} />}
        {session.category === "quest" && <MetaQuestFlow sessionId={id} />}
        {session.category === "nas" && <NASFlow sessionId={id} />}
        {session.category === "printer3d" && <Printer3DFlow sessionId={id} />}
        {session.category === "projector" && <ProjectorFlow sessionId={id} />}
        {session.category === "rogally" && <ROGAllyFlow sessionId={id} />}
      </div>
    </div>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="mt-3 text-sm text-ink-secondary">{children}</div>
    </div>
  );
}
