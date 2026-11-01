import { qs } from "../lib/dom";
import { refreshBandsintown } from "./bandsintown";
import { closeAllDialogs } from "./dialog";
import { closeLightbox } from "./lightbox";
import { syncNav } from "./nav";
import { syncBackground } from "./theme";
import { toast } from "./toast";

// Links between pages swap the page's <main> instead of reloading, so the
// music player keeps playing. Every page is still a complete HTML file, and
// anything unexpected falls back to a normal page load.

interface RouterHooks {
  beforeSwap(): void;
  afterSwap(): void;
}

let hooks: RouterHooks | null = null;
let lockedMessage: string | null = null;
let currentUrl = location.href;
const pages = new Map<string, Promise<string>>();

/** Stops navigation (e.g. while a payment is processing). Pass null to allow it again. */
export const lockNavigation = (message: string | null): void => {
  lockedMessage = message;
};

const pageKey = (url: URL): string => url.pathname + url.search;

const fetchPage = (url: URL): Promise<string> => {
  const key = pageKey(url);
  let page = pages.get(key);
  if (!page) {
    page = fetch(url, { credentials: "same-origin" }).then(async (response) => {
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || !type.includes("text/html")) throw new Error(`Can't load ${key}`);
      return response.text();
    });
    page.catch(() => pages.delete(key));
    pages.set(key, page);
  }
  return page;
};

/** Same-site page links that can be swapped in place. */
const swappableUrl = (link: HTMLAnchorElement): URL | null => {
  if (link.target && link.target !== "_self") return null;
  if (link.hasAttribute("download") || "noSwap" in link.dataset) return null;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin) return null;
  if (!/(\.html|\/)$/.test(url.pathname)) return null;
  return url;
};

const scrollToHash = (hash: string, smooth: boolean): boolean => {
  if (!hash) return false;
  const target = document.getElementById(decodeURIComponent(hash.slice(1)));
  target?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  return Boolean(target);
};

const navigate = async (url: URL, options: { push: boolean; scroll?: number }): Promise<void> => {
  if (lockedMessage) {
    toast(lockedMessage, { tone: "info" });
    // Back/forward already changed the address: put it back.
    if (!options.push) history.pushState({ scroll: window.scrollY }, "", currentUrl);
    return;
  }
  try {
    const markup = await fetchPage(url);
    const next = new DOMParser().parseFromString(markup, "text/html");
    const nextMain = next.querySelector("main");
    const main = qs("main");
    if (!nextMain || !main || !hooks) throw new Error("Page has no <main>");

    if (options.push) {
      history.replaceState({ ...history.state, scroll: window.scrollY }, "");
      history.pushState({ scroll: 0 }, "", url);
    }
    currentUrl = url.href;
    closeAllDialogs();
    closeLightbox();
    hooks.beforeSwap();

    document.title = next.title;
    const description = next.querySelector('meta[name="description"]')?.getAttribute("content");
    if (description) qs('meta[name="description"]')?.setAttribute("content", description);
    document.body.dataset.page = next.body.dataset.page ?? "";
    const adopted = document.adoptNode(nextMain);
    main.replaceWith(adopted);
    syncNav(next);
    syncBackground(next);

    if (!scrollToHash(url.hash, false)) window.scrollTo(0, options.scroll ?? 0);
    adopted.setAttribute("tabindex", "-1");
    adopted.focus({ preventScroll: true });

    hooks.afterSwap();
    refreshBandsintown(adopted);
  } catch {
    location.assign(url.href);
  }
};

export const initRouter = (routerHooks: RouterHooks): void => {
  hooks = routerHooks;
  if (!("DOMParser" in window) || !("pushState" in history)) return;
  history.scrollRestoration = "manual";
  history.replaceState({ scroll: window.scrollY }, "");

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element).closest?.("a[href]");
    if (!(link instanceof HTMLAnchorElement)) return;

    // Links within the page scroll smoothly.
    const href = link.getAttribute("href") ?? "";
    if (href.startsWith("#")) {
      if (scrollToHash(href, true)) event.preventDefault();
      return;
    }

    const url = swappableUrl(link);
    if (!url) return;
    event.preventDefault();
    if (pageKey(url) === pageKey(new URL(location.href)) && !url.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    void navigate(url, { push: true });
  });

  // Start loading a page when the pointer heads for its link.
  const prefetch = (event: Event) => {
    const link = (event.target as Element).closest?.("a[href]");
    if (link instanceof HTMLAnchorElement) {
      const url = swappableUrl(link);
      if (url) fetchPage(url).catch(() => undefined);
    }
  };
  document.addEventListener("mouseover", prefetch, { passive: true });
  document.addEventListener("touchstart", prefetch, { passive: true });

  window.addEventListener("popstate", (event) => {
    const scroll = (event.state as { scroll?: number } | null)?.scroll ?? 0;
    void navigate(new URL(location.href), { push: false, scroll });
  });
};
