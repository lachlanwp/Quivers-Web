import { initNewsletterForms } from "./components/forms";
import { band } from "./data/band";
import { cart } from "./data/cart";
import { qs } from "./lib/dom";
import { pages } from "./pages";
import { initPlayer } from "./player/player";
import { choosePlant, initParallax, observeFadeIns } from "./site/effects";
import { initLightbox } from "./site/lightbox";
import { initLoader } from "./site/loader";
import { initNav } from "./site/nav";
import { initRouter } from "./site/router";

// Every page is plain HTML that works on its own. This script adds the
// behaviour, and the store, music player and other content from the API.

let cleanups: (() => void)[] = [];

const mountPage = () => {
  const main = qs("main");
  if (!main) return;
  const init = pages[document.body.dataset.page ?? ""];
  init?.({ main, cleanup: (fn) => cleanups.push(fn) });
  observeFadeIns(main);
};

const unmountPage = () => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
};

choosePlant();
initLoader();
initParallax();
initNav();
initLightbox();
initPlayer();
initNewsletterForms();
initRouter({ beforeSwap: unmountPage, afterSwap: mountPage });
mountPage();

void band.refresh();
// Once the store's products are known, drop cart items that are no longer for sale.
band.subscribe((state) => {
  if (state.fresh) cart.prune(state.merch);
});
