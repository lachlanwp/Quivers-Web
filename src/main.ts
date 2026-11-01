import { socialLinks } from "./components/band-links";
import { initNewsletterForms } from "./components/forms";
import { band } from "./data/band";
import { cart } from "./data/cart";
import { startAnalytics } from "./lib/analytics";
import { qs } from "./lib/dom";
import { pages } from "./pages";
import { renderIfChanged } from "./pages/page";
import { initPlayer } from "./player/player";
import { refreshBandsintown } from "./site/bandsintown";
import { initParallax, observeFadeIns } from "./site/effects";
import { initLightbox } from "./site/lightbox";
import { initLoader } from "./site/loader";
import { initNav } from "./site/nav";
import { initRouter } from "./site/router";
import { applyTheme } from "./site/theme";

// Every page is plain HTML that works on its own. This script adds the
// behaviour, and the store, music player and other content from the API.

let cleanups: (() => void)[] = [];

const mountPage = () => {
  const main = qs("main");
  if (!main) return;
  // The band's colour, logo, photos and page background, before the page's
  // own code (which may read the colour).
  cleanups.push(band.subscribe(applyTheme));
  const init = pages[document.body.dataset.page ?? ""];
  init?.({ main, cleanup: (fn) => cleanups.push(fn) });
  observeFadeIns(main);
};

const unmountPage = () => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
};

initLoader();
initParallax();
initNav();
initLightbox();
initPlayer();
initNewsletterForms();
initRouter({ beforeSwap: unmountPage, afterSwap: mountPage });
mountPage();

void band.refresh();
band.subscribe((state) => startAnalytics(state.about?.ga_tag));
// The band's socials and music services replace the footer's own links.
const footerLinks = qs("[data-social-links]");
band.subscribe((state) => {
  const links = socialLinks(state.links);
  if (footerLinks && links) renderIfChanged(footerLinks, links);
});
// The tour widget takes its colours when it loads, so wait for the band's.
void band.whenReady(3000).then(() => refreshBandsintown(document));
// Once the store's products are known, drop cart items that are no longer for sale.
band.subscribe((state) => {
  if (state.fresh) cart.prune(state.merch);
});
