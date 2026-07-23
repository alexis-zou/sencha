// Client-side persistence layer.
//
// The original prototype ran inside Claude.ai's artifact sandbox and used
// a `window.storage` key-value API (get/set/delete, async, JSON-serialized
// values). This module provides a drop-in equivalent backed by
// `localStorage` so the exact same call sites (`storage.get(key)`,
// `storage.set(key, value)`, `storage.delete(key)`) work unchanged once
// this becomes a real Next.js app running in a normal browser.
//
// NOTE: this is intentionally still a *local-only* store (see DECISIONS.md
// "Local-first persistence, no backend yet"). Swapping this module's
// internals for real API calls is the intended seam when a backend is
// introduced — nothing above this layer should need to change.

function isBrowser() {
  return typeof window !== 'undefined';
}

export const storage = {
  async get<T = string>(key: string): Promise<{ key: string; value: string } | null> {
    if (!isBrowser()) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return { key, value: raw };
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<{ key: string; value: string } | null> {
    if (!isBrowser()) return null;
    try {
      window.localStorage.setItem(key, value);
      return { key, value };
    } catch {
      return null;
    }
  },

  async delete(key: string): Promise<{ key: string; deleted: boolean } | null> {
    if (!isBrowser()) return null;
    try {
      window.localStorage.removeItem(key);
      return { key, deleted: true };
    } catch {
      return null;
    }
  },
};
