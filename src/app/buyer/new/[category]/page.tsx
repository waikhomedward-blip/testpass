import { notFound } from "next/navigation";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "@/lib/primitives";
import { Category } from "@/lib/types";
import NewSessionForm from "@/components/buyer/NewSessionForm";
import CategoryIcon from "@/components/CategoryIcon";

export default async function NewSessionPage(props: PageProps<"/buyer/new/[category]">) {
  const { category } = await props.params;
  const config = CATEGORY_CONFIG[category as Category];
  if (!config) notFound();

  if (!config.available) {
    const liveLabels = CATEGORY_ORDER.filter((c) => CATEGORY_CONFIG[c].available).map(
      (c) => CATEGORY_CONFIG[c].label
    );
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold">{config.label} is coming soon</h1>
        <p className="mt-3 text-ink-secondary">
          TestPass ships one category at a time so each test is actually reliable. {config.label}{" "}
          testing ({config.functionTested}) is on the roadmap
          {liveLabels.length > 0 ? ` — ${liveLabels.join(", ")} ${liveLabels.length === 1 ? "is" : "are"} live today.` : "."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-signal/10 text-signal">
          <CategoryIcon category={config.category} className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-semibold">Test a {config.label}</h1>
      </div>
      <p className="mt-2 text-ink-secondary">{config.shortPitch}</p>
      <div className="mt-6">
        <NewSessionForm config={config} />
      </div>
    </div>
  );
}
