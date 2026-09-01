import { notFound } from "next/navigation";
import { getSession, markSessionStarted } from "@/lib/db";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { isExpired } from "@/lib/time";
import SwitchFlow from "@/components/seller/SwitchFlow";
import GoProFlow from "@/components/seller/GoProFlow";
import DJIFlow from "@/components/seller/DJIFlow";
import DigicamFlow from "@/components/seller/DigicamFlow";
import PS5Flow from "@/components/seller/PS5Flow";

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

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        TestPass · {config.label}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Quick device test</h1>
      <p className="mt-2 text-sm text-foreground/60">
        No account, nothing to install. This takes about {Math.round(config.estimatedSeconds / 30) * 30}{" "}
        seconds. TestPass only collects what&apos;s needed for this test.
      </p>

      <div className="mt-6">
        {session.category === "switch" && <SwitchFlow sessionId={id} />}
        {session.category === "gopro" && <GoProFlow sessionId={id} />}
        {session.category === "dji" && <DJIFlow sessionId={id} />}
        {session.category === "camera" && <DigicamFlow sessionId={id} />}
        {session.category === "ps5" && <PS5Flow sessionId={id} />}
      </div>
    </div>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="mt-3 text-foreground/60">{children}</div>
    </div>
  );
}
