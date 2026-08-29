import { notFound } from "next/navigation";
import { CATEGORY_CONFIG } from "@/lib/primitives";
import { Category } from "@/lib/types";
import NewSessionForm from "@/components/buyer/NewSessionForm";

export default async function NewSessionPage(props: PageProps<"/buyer/new/[category]">) {
  const { category } = await props.params;
  const config = CATEGORY_CONFIG[category as Category];
  if (!config) notFound();

  if (!config.available) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold">{config.label} is coming soon</h1>
        <p className="mt-3 text-foreground/60">
          TestPass ships one category at a time so each test is actually reliable. {config.label}{" "}
          testing ({config.functionTested}) is on the roadmap — Switch and GoPro are live today.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">Test a {config.label}</h1>
      <p className="mt-2 text-foreground/60">{config.shortPitch}</p>
      <div className="mt-6">
        <NewSessionForm config={config} />
      </div>
    </div>
  );
}
