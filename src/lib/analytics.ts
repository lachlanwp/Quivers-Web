let started = false;

/**
 * Starts Google Analytics (gtag.js) with the band's measurement ID from the
 * API, e.g. "G-YMG0NST2G1". Only the first ID counts.
 */
export const startAnalytics = (measurementId: string | null | undefined): void => {
  const id = measurementId?.trim();
  if (started || !id || !/^[A-Z]{1,4}-[A-Z0-9-]+$/i.test(id)) return;
  started = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(script);
};

/** Sends an event to Google Analytics when it has started. */
export const track = (name: string, params: Record<string, unknown> = {}): void => {
  try {
    window.gtag?.("event", name, params);
  } catch {
    // Analytics must never break the page.
  }
};
