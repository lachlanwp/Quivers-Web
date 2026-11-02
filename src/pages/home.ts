import { bindAddToCartButtons } from "../components/add-to-cart";
import { productCard } from "../components/product-card";
import { band, currencyOf, merchOverrideUrl } from "../data/band";
import { isSoldOut, publishedMerch } from "../data/merch";
import { html, qs } from "../lib/dom";
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
};
