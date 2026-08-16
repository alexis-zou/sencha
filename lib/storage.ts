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
