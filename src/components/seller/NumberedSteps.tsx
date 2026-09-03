// Shared "signature grammar" numeral treatment for a short instruction
// list — the same bold mono blue numeral used in the Wave 1.1 identity
// exploration's Direction C ("Signal & Grid"). Real sequence information
// (do this, then this, then this), so — unlike the evidence-frame
// registration corners — it's meant to repeat across all 13+ categories
// without wearing out; see the globals.css note above .step-num-lg.
export default function NumberedSteps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-0">
      {items.map((step, i) => (
        <li
          key={i}
          className="flex gap-3 border-b border-border-subtle py-2.5 text-sm last:border-b-0"
        >
          <span className="shrink-0 pt-0.5 font-mono text-xs font-bold text-signal">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
