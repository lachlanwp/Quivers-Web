import { icon } from "../components/icons";
import { productUrl } from "../components/product-card";
import { band, currencyOf, type BandState } from "../data/band";
import { cart, requiresShipping, subtotalCents, unitCents, variationsLabel, type CartItem } from "../data/cart";
import { findProduct, maxQuantity, productImages } from "../data/merch";
import { html, qs, type SafeHtml } from "../lib/dom";
import { money } from "../lib/format";
import { renderIfChanged, type PageInit } from "./page";

const emptyCart = (): SafeHtml =>
  html`<div class="empty-state">
    <h2>Your cart is empty</h2>
    <p>Records, shirts and more are waiting in the store.</p>
    <a class="btn btn-primary" href="merch.html" data-merch-link>Browse merch</a>
  </div>`;

const cartRow = (item: CartItem, state: BandState): SafeHtml => {
  const product = findProduct(state.merch, item.productId);
  if (!product) return html``;
  const currency = currencyOf(state);
  const image = productImages(product)[0];
  const options = variationsLabel(item.variations);
  const max = maxQuantity(product, item.variations);
  return html`<li class="cart-item" data-item="${item.itemId}">
    <a class="cart-item-image" href="${productUrl(product)}" tabindex="-1" aria-hidden="true">
      ${image ? html`<img src="${image}" alt="" loading="lazy" />` : ""}
    </a>
    <div class="cart-item-info">
      <a class="cart-item-title" href="${productUrl(product)}">${product.title}</a>
      ${options ? html`<p class="muted">${options}</p>` : ""}
      <p class="muted">${money(unitCents(item, product), currency)} each</p>
    </div>
    <div class="cart-item-qty">
      ${item.type === "DIGITAL"
        ? html`<span class="muted">Download</span>`
        : html`<div class="qty-stepper qty-stepper-sm">
            <button type="button" data-qty="-1" aria-label="Decrease quantity of ${product.title}">${icon("minus")}</button>
            <span class="qty-value" aria-live="polite">${item.quantity}</span>
            <button type="button" data-qty="1" aria-label="Increase quantity of ${product.title}" ${item.quantity >= max ? "disabled" : ""}>${icon("plus")}</button>
          </div>`}
    </div>
    <div class="cart-item-total price">${money(unitCents(item, product) * item.quantity, currency)}</div>
    <button type="button" class="cart-item-remove" data-remove aria-label="Remove ${product.title}">${icon("trash")}</button>
  </li>`;
};

const cartMarkup = (items: CartItem[], state: BandState): SafeHtml => {
  const currency = currencyOf(state);
  const subtotal = subtotalCents(items, state.merch);
  const paymentsReady = Boolean(state.about?.stripe_public_key);
  return html`<div class="cart-layout">
    <ul class="cart-list">${items.map((item) => cartRow(item, state))}</ul>
    <aside class="summary-card">
      <h2>Order summary</h2>
      <div class="summary-row"><span>Subtotal</span><span class="price">${money(subtotal, currency)}</span></div>
      ${requiresShipping(items)
        ? html`<div class="summary-row muted"><span>Shipping</span><span>Calculated at checkout</span></div>`
        : ""}
      <div class="summary-row summary-total"><span>Total</span><span class="price">${money(subtotal, currency)}</span></div>
      ${state.fresh && !paymentsReady
        ? html`<p class="alert alert-error">Online payments aren't set up yet. Please contact us to order.</p>`
        : html`<a class="btn btn-primary btn-block" href="checkout.html">${icon("lock")} Checkout</a>`}
      <a class="summary-link" href="merch.html" data-merch-link>Continue shopping</a>
    </aside>
  </div>`;
};

export const cartPage: PageInit = ({ main, cleanup }) => {
  const root = qs("[data-cart]", main);
  if (!root) return;
  void band.refresh(60_000);

  const onClick = (event: Event) => {
    const target = event.target as Element;
    const row = target.closest<HTMLElement>("[data-item]");
    const item = cart.get().items.find((i) => i.itemId === row?.dataset.item);
    if (!item) return;
    if (target.closest("[data-remove]")) return cart.remove(item.itemId);
    const step = target.closest<HTMLElement>("[data-qty]");
    if (step) {
      const product = findProduct(band.get().merch, item.productId);
      cart.setQuantity(item.itemId, item.quantity + Number(step.dataset.qty), product);
    }
  };
  root.addEventListener("click", onClick);
  cleanup(() => root.removeEventListener("click", onClick));

  const draw = () => {
    const state = band.get();
    const { items } = cart.get();
    if (state.fresh) cart.prune(state.merch);
    if (items.length === 0) return renderIfChanged(root, emptyCart());
    if (state.status === "loading" && !state.merch.length) {
      return renderIfChanged(root, html`<p class="loading-message">Loading your cart…</p>`);
    }
    if (state.status === "error" && !state.merch.length) {
      return renderIfChanged(
        root,
        html`<div class="empty-state"><h2>The store isn't available right now</h2><p>Your cart is saved. Please try again soon.</p></div>`,
      );
    }
    renderIfChanged(root, cartMarkup(items, state));
  };
  cleanup(band.subscribe(draw));
  cleanup(cart.subscribe(draw));
};
