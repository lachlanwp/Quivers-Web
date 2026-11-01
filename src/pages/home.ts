import { bindAddToCartButtons } from "../components/add-to-cart";
import { icon } from "../components/icons";
import { productCard } from "../components/product-card";
import { band, currencyOf, merchOverrideUrl } from "../data/band";
import { isSoldOut, publishedMerch } from "../data/merch";
import { html, qs, render } from "../lib/dom";
import { player } from "../player/player";
import { observeFadeIns } from "../site/effects";
import { renderIfChanged, type PageInit } from "./page";

export const home: PageInit = ({ main, cleanup }) => {
  // A few products from the store, in-stock ones first.
  const section = qs("[data-featured-merch]", main);
  const grid = section && qs("[data-product-grid]", section);
  if (section && grid) {
    cleanup(bindAddToCartButtons(grid));
    cleanup(
      band.subscribe((state) => {
        const products = publishedMerch(state.merch);
        const featured = [
          ...products.filter((p) => !isSoldOut(p)),
          ...products.filter(isSoldOut),
        ].slice(0, 3);
        const visible = featured.length > 0 && !merchOverrideUrl(state);
        section.hidden = !visible;
        if (visible && renderIfChanged(grid, html`${featured.map((p) => productCard(p, currencyOf(state)))}`)) {
          observeFadeIns(grid);
        }
      }),
    );
  }

  // "Listen" starts the music player.
  const listen = qs<HTMLButtonElement>("[data-listen]", main);
  if (listen) {
    listen.addEventListener("click", () => {
      const { tracks, index } = player.get();
      if (tracks.length) player.playTrack(index);
    });
    cleanup(
      player.subscribe((state) => {
        listen.hidden = !state.enabled || state.tracks.length === 0;
        const label = state.playing ? "Pause" : "Listen";
        if (listen.dataset.label !== label) {
          listen.dataset.label = label;
          render(listen, html`${icon(state.playing ? "pause" : "play")} ${label}`);
        }
      }),
    );
  }
};
