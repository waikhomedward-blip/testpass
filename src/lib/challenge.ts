import { customAlphabet } from "nanoid";

// A short, easy-to-read-aloud one-time code for the digicam zoom test (see
// primitives.ts "camera" config). Generated fresh per attempt, client-side —
// it doesn't need to be cryptographically unguessable, only fresh enough
// that a seller can't reuse an old stock photo of the same code.
const nanoid = customAlphabet("23456789ACDEFGHJKMNPQRSTUVWXYZ", 6);

export function newChallengeCode(): string {
  const code = nanoid();
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}
