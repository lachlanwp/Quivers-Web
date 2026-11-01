import type { Merch } from "../api/client";
import { bindProductOptions, productOptionsForm, showAddedDialog } from "../components/add-to-cart";
import { icon } from "../components/icons";
import { productBadges } from "../components/product-card";
import { config } from "../config";
import { band, currencyOf, merchOverrideUrl } from "../data/band";
import { findProduct, isDigital, productImages, shippingNote, stockNote } from "../data/merch";
import { track } from "../lib/analytics";
import { html, qs, qsa, safeUrl, type SafeHtml } from "../lib/dom";
import { money } from "../lib/format";
import { hasText, sanitizeHtml } from "../lib/sanitize";
import { openLightbox } from "../site/lightbox";
import { renderIfChanged, type PageInit } from "./page";

const fileSize = (bytes: number): string => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power ? 1 : 0)} ${units[power]}`;
};

const digitalDetails = (product: Merch): SafeHtml => {
  const pack = product.sample_pack;
  if (!pack) return html``;
  return html`<div class="product-section">
      <h2>What's included</h2>
      <ul class="file-list">
        ${(pack.files ?? []).map((f) => html`<li><span>${f.file_name}</span><span class="muted">${fileSize(f.size_bytes)}</span></li>`)}
      </ul>
    </div>
    ${(pack.previews ?? []).length
      ? html`<div class="product-section">
          <h2>Previews</h2>
          ${pack.previews.map((p) => {
            const type = String(p.type).toUpperCase();
            if (type === "AUDIO") return html`<p class="preview-name">${p.file_name}</p><audio controls preload="none" src="${p.file_object_id}"></audio>`;
            if (type === "VIDEO") return html`<video controls preload="none" src="${p.file_object_id}"></video>`;
            if (type === "IMAGE") return html`<img class="preview-image" src="${p.file_object_id}" alt="${p.file_name}" loading="lazy" />`;
            return html`<p><a href="${safeUrl(p.file_object_id)}" target="_blank" rel="noopener noreferrer">${p.file_name} ${icon("external")}</a></p>`;
          })}
        </div>`
      : ""}`;
};

const productMarkup = (product: Merch, currency: string): SafeHtml => {
  const images = productImages(product);
  const stock = stockNote(product);
  return html`<nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="merch.html" data-merch-link>Merch</a>
      <span aria-hidden="true">/</span>
      <span aria-current="page">${product.breadcrumb || product.title}</span>
    </nav>
    <div class="product-layout">
      <div class="product-gallery">
        ${images.length
          ? html`<button type="button" class="product-gallery-main" data-gallery-open aria-label="View larger image">
              <img src="${images[0]}" alt="${product.title}" data-gallery-image />
            </button>`
          : html`<div class="product-gallery-main product-card-placeholder">${product.title}</div>`}
        ${images.length > 1
          ? html`<div class="product-thumbs">
              ${images.map(
                (src, i) => html`<button type="button" class="product-thumb ${i === 0 ? "is-active" : ""}" data-thumb="${i}" aria-label="Show image ${i + 1}">
                  <img src="${src}" alt="" loading="lazy" />
                </button>`,
              )}
            </div>`
          : ""}
      </div>
      <div class="product-info">
        <h1 class="product-title">${product.title}</h1>
        <div class="badges">${productBadges(product)}</div>
        <p class="product-price price">${money(product.price, currency)}</p>
        ${stock ? html`<p class="stock-note">${stock}</p>` : ""}
        ${productOptionsForm(product, currency)}
        ${hasText(product.description)
          ? html`<div class="product-section rich-text">${sanitizeHtml(product.description)}</div>`
          : ""}
        ${isDigital(product)
          ? digitalDetails(product)
          : html`<div class="product-section">
              <h2>Shipping</h2>
              <p>${shippingNote(product)} Postage is worked out at checkout from your address.</p>
            </div>`}
      </div>
    </div>`;
};

export const product: PageInit = ({ main, cleanup }) => {
  const root = qs("[data-product]", main);
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id");
  let viewed = "";
  let activeImage = 0;

  const onClick = (event: Event) => {
    const target = event.target as Element;
    const current = findProduct(band.get().merch, id);
    if (!current) return;
    const images = productImages(current);
    const thumb = target.closest<HTMLElement>("[data-thumb]");
    if (thumb) {
      activeImage = Number(thumb.dataset.thumb);
      const main = qs<HTMLImageElement>("[data-gallery-image]", root);
      if (main) main.src = images[activeImage];
      qsa("[data-thumb]", root).forEach((t) => t.classList.toggle("is-active", t === thumb));
    }
    if (target.closest("[data-gallery-open]")) {
      openLightbox(images, activeImage, { fit: "contain", alt: current.title });
    }
  };
  root.addEventListener("click", onClick);
  cleanup(() => root.removeEventListener("click", onClick));
  void band.refresh(60_000);

  cleanup(
    band.subscribe((state) => {
      const found = findProduct(state.merch, id);
      const override = merchOverrideUrl(state);
      if (!found || !found.is_published || override) {
        if (state.status === "loading" && !found) return; // still waiting for data
        document.title = "Merch - Quivers";
        const external = override ?? (state.status === "error" ? config.bandcampMerchUrl : null);
        renderIfChanged(
          root,
          html`<div class="empty-state">
            <h1>${external ? "Shop Quivers merch online" : "We couldn't find that item"}</h1>
            <p>${external ? "Our store isn't available here right now, but you can find records, shirts and more online." : "It may have sold out or been removed."}</p>
            ${external
              ? html`<a class="btn btn-primary" href="${external}" target="_blank" rel="noopener noreferrer">Shop online ${icon("external")}</a>`
              : html`<a class="btn btn-primary" href="merch.html" data-merch-link>Browse merch</a>`}
          </div>`,
        );
        return;
      }

      const currency = currencyOf(state);
      if (renderIfChanged(root, productMarkup(found, currency))) {
        activeImage = 0;
        document.title = `${found.title} - Quivers`;
        const form = qs<HTMLFormElement>("[data-product-form]", root);
        if (form) {
          bindProductOptions(form, found, (quantity, variations, unitCents) =>
            showAddedDialog(found, quantity, variations, unitCents),
          );
        }
        if (viewed !== found.id) {
          viewed = found.id;
          track("view_item", {
            currency,
            value: found.price / 100,
            items: [{ item_id: found.sku || found.id, item_name: found.title, price: found.price / 100 }],
          });
        }
      }
    }),
  );
};
