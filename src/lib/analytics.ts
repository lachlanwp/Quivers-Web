/** Sends an event to Google Analytics when it has loaded. */
export const track = (name: string, params: Record<string, unknown> = {}): void => {
  try {
    window.gtag?.("event", name, params);
  } catch {
    // Analytics must never break the page.
  }
};
