import type { Merch } from "../api/client";
import { isDigital, isPreorder, isSoldOut, productImages } from "../data/merch";
import { html, type SafeHtml } from "../lib/dom";
import { money } from "../lib/format";

export const productUrl = (product: Merch): string => `product.html?id=${encodeURIComponent(product.id)}`;

export const productBadges = (product: Merch): SafeHtml =>
  html`${isDigital(product) ? html`<span class="badge">Digital</span>` : ""}
  ${isPreorder(product) ? html`<span class="badge">Pre-order</span>` : ""}
  ${isSoldOut(product) ? html`<span class="badge badge-muted">Sold out</span>` : ""}`;

export const productCard = (product: Merch, currency: string): SafeHtml => {
  const image = productImages(product)[0];
  const soldOut = isSoldOut(product);
  return html`<article class="product-card">
    <a class="product-card-image" href="${productUrl(product)}" tabindex="-1" aria-hidden="true">
      ${image
        ? html`<img src="${image}" alt="" loading="lazy" />`
        : html`<span class="product-card-placeholder">${product.title}</span>`}
    </a>
    <div class="product-card-body">
      <h3 class="product-card-title"><a href="${productUrl(product)}" title="${product.title}">${product.title}</a></h3>
      <div class="badges">${productBadges(product)}</div>
      <div class="product-card-footer">
        <span class="price">${money(product.price, currency)}</span>
        <button type="button" class="btn btn-primary btn-sm" data-add-to-cart="${product.id}" ${soldOut ? "disabled" : ""}>
          ${soldOut ? "Sold out" : "Add to cart"}
        </button>
      </div>
    </div>
  </article>`;
};

export const productCardSkeletons = (count: number): SafeHtml =>
  html`${Array.from({ length: count }, () => html`<div class="product-card product-card-skeleton" aria-hidden="true">
      <div class="product-card-image skeleton"></div>
      <div class="product-card-body">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line skeleton-short"></div>
      </div>
    </div>`)}`;
