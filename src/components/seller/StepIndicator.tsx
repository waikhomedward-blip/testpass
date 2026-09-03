// Small, shared progress indicator for seller flows. Per the product doc's
// friction doctrine, a seller should always be able to tell how far along
// they are without reading anything — this is a glanceable primitive, not
// a tutorial.

export default function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number; // 0-indexed
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= current ? "bg-signal" : "bg-border"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-ink-secondary">
        Step {current + 1} of {steps.length} · {steps[current]}
      </p>
    </div>
  );
}
