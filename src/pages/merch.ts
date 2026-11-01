import { bindAddToCartButtons } from "../components/add-to-cart";
import { productCard, productCardSkeletons } from "../components/product-card";
import { band, currencyOf, merchOverrideUrl } from "../data/band";
import { publishedMerch } from "../data/merch";
import { html, qs } from "../lib/dom";
import { observeFadeIns } from "../site/effects";
import { renderIfChanged, type PageInit } from "./page";

export const merch: PageInit = ({ main, cleanup }) => {
  const grid = qs("[data-product-grid]", main);
  const fallback = qs("[data-shop-fallback]", main);
  const fallbackLink = qs<HTMLAnchorElement>("[data-shop-fallback-link]", main);
  const empty = qs("[data-shop-empty]", main);
  if (!grid) return;

  cleanup(bindAddToCartButtons(grid));
  void band.refresh(60_000);

  cleanup(
    band.subscribe((state) => {
      const override = merchOverrideUrl(state);
      const products = publishedMerch(state.merch);
      const unavailable = state.status === "error" || Boolean(override);

      // The store can't load (or the band sells elsewhere): point to Bandcamp.
      if (fallback) fallback.hidden = !unavailable;
      if (fallbackLink && override) fallbackLink.href = override;
      grid.hidden = unavailable;
      if (empty) {
        empty.hidden = unavailable || state.status === "loading" || products.length > 0;
        if (state.settings?.no_merch_label) empty.textContent = state.settings.no_merch_label;
      }
      if (unavailable) return;

      if (state.status === "loading" && products.length === 0) {
        renderIfChanged(grid, productCardSkeletons(6));
        return;
      }
      if (renderIfChanged(grid, html`${products.map((p) => productCard(p, currencyOf(state)))}`)) {
        observeFadeIns(grid);
      }
    }),
  );
};
