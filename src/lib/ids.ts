import { customAlphabet } from "nanoid";

// Lowercase + digits, no ambiguous characters (no 0/o/1/l/i) — these ids
// get read aloud, typed by hand, and pasted into texts to sellers.
const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 10);

export function newSessionId(): string {
  return nanoid();
}
