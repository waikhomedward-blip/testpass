"use client";

// TestPass has no buyer accounts — a session link is the only thing that
// identifies a test. That's fine for one test, but a buyer who sends links
// to several sellers (or just closes the tab and comes back later) has no
// way to find their way back to any of them except by digging up the
// original link. This keeps a running list of every session a buyer creates
// in *this browser*, so they always have one place to see all of them.
// It's deliberately just localStorage, not an account — nothing here is
// shared across devices or synced anywhere.
const KEY = "testpass_session_history";
const MAX_ENTRIES = 50;

export interface SessionHistoryEntry {
  id: string;
  category: string;
  createdAt: string; // ISO timestamp
}

function readRaw(): SessionHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is SessionHistoryEntry =>
        e && typeof e.id === "string" && typeof e.category === "string" && typeof e.createdAt === "string"
    );
  } catch {
    return [];
  }
}

export function getSessionHistory(): SessionHistoryEntry[] {
  return readRaw().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addSessionToHistory(entry: SessionHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readRaw().filter((e) => e.id !== entry.id);
    const next = [entry, ...existing].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Best-effort — a buyer who has localStorage disabled/full just won't
    // get the "My tests" convenience, nothing else depends on this.
  }
}

export function removeSessionFromHistory(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = readRaw().filter((e) => e.id !== id);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // no-op — see addSessionToHistory
  }
}
