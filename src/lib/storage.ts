// Browser storage can be missing or throw (private mode, blocked cookies),
// so every access is wrapped and the site works without it.

type Area = "local" | "session";

const area = (which: Area): Storage | null => {
  try {
    return which === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
};

export const readJson = <T>(which: Area, key: string): T | null => {
  try {
    const value = area(which)?.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
};

export const writeJson = (which: Area, key: string, value: unknown): void => {
  try {
    area(which)?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the value just isn't remembered.
  }
};

export const removeKey = (which: Area, key: string): void => {
  try {
    area(which)?.removeItem(key);
  } catch {
    // Nothing to do.
  }
};
