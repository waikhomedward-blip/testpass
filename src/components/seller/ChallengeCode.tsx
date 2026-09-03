// Wave 1.1 refinement: the challenge code is information, not an action —
// it shouldn't compete with the actual CTA for visual weight. Earlier
// versions rendered it inside a filled signal-blue-tinted box with the
// code itself in bold blue. Now: a small blue accent mark + mono label,
// the code itself in plain ink at a size that stays legible without being
// the loudest thing on the screen, generous whitespace, no container.
export default function ChallengeCode({ code, hint }: { code: string | null; hint?: string }) {
  return (
    <div className="border-t border-border-subtle pt-4">
      <div className="flex items-center gap-2">
        <span className="h-3 w-0.5 shrink-0 bg-signal" aria-hidden="true" />
        <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-ink-secondary">Test code</p>
      </div>
      <p className="mt-2 font-mono text-[28px] font-bold leading-none tracking-wide text-foreground">
        {code ?? "Preparing…"}
      </p>
      {hint && <p className="mt-2 text-xs text-ink-secondary">{hint}</p>}
    </div>
  );
}
