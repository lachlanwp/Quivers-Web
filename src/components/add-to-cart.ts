import type { Merch } from "../api/client";
import { band, currencyOf } from "../data/band";
import { cart, variationsLabel } from "../data/cart";
import {
  choosableVariations,
  defaultVariations,
  findProduct,
  isDigital,
  isSoldOut,
  maxQuantity,
  optionStock,
  productImages,
  type Variations,
} from "../data/merch";
import { track } from "../lib/analytics";
import { html, qs, qsa, render, type SafeHtml } from "../lib/dom";
import { currencySymbol, money, moneyText } from "../lib/format";
import { openDialog } from "../site/dialog";
import { icon } from "./icons";

/** Options (variations, quantity, name your price) and an Add to cart button. */
export const productOptionsForm = (product: Merch, currency: string, idPrefix = "product"): SafeHtml => {
  const id = `${idPrefix}-${product.id}`;
  const chosen = defaultVariations(product);
  const soldOut = isSoldOut(product);
  const max = maxQuantity(product, chosen);
  return html`<form class="product-options" novalidate data-product-form="${product.id}">
    ${choosableVariations(product).map(
      (variation, i) => html`<div class="field">
        <label for="${id}-v${i}">${variation.label}</label>
        <select id="${id}-v${i}" name="variation" data-label="${variation.label}">
          ${variation.merch_variation_options.map((option) => {
            const stock = optionStock(product, variation.label, option.option) ?? 0;
            return html`<option value="${option.option}" ${stock <= 0 ? "disabled" : ""} ${chosen[variation.label] === option.option ? "selected" : ""}>
              ${option.option}${stock <= 0 ? " (sold out)" : ""}
            </option>`;
          })}
        </select>
      </div>`,
    )}
    <div class="field-row">
      ${isDigital(product)
        ? ""
        : html`<div class="field">
            <label for="${id}-qty">Quantity</label>
            <div class="qty-stepper">
              <button type="button" data-step="-1" aria-label="Decrease quantity">${icon("minus")}</button>
              <input id="${id}-qty" name="quantity" type="number" inputmode="numeric" min="1" max="${Math.max(max, 1)}" value="1" />
              <button type="button" data-step="1" aria-label="Increase quantity">${icon("plus")}</button>
            </div>
          </div>`}
      <div class="field">
        <label for="${id}-price">Name your price</label>
        <div class="input-prefix">
          <span>${currencySymbol(currency).trim()}</span>
          <input id="${id}-price" name="price" type="text" inputmode="decimal" autocomplete="off" value="${(product.price / 100).toFixed(2)}" aria-describedby="${id}-price-hint" />
        </div>
      </div>
    </div>
    <p class="field-hint" id="${id}-price-hint">Minimum ${moneyText(product.price, currency)}. Pay more if you'd like to support the band.</p>
    <p class="form-error" role="alert" hidden></p>
    <button type="submit" class="btn btn-primary btn-block" ${soldOut ? "disabled" : ""}>
      ${soldOut ? "Sold out" : html`${icon("bag")} Add to cart`}
    </button>
  </form>`;
};

const readVariations = (form: HTMLFormElement): Variations => {
  const chosen: Variations = {};
  for (const select of qsa<HTMLSelectElement>('select[name="variation"]', form)) {
    chosen[select.dataset.label ?? ""] = select.value;
  }
  return chosen;
};

/** Wires up a form made by productOptionsForm. Calls onAdded after a successful add. */
export const bindProductOptions = (
  form: HTMLFormElement,
  product: Merch,
  onAdded: (quantity: number, variations: Variations, unitCents: number) => void,
): void => {
  const quantity = qs<HTMLInputElement>('input[name="quantity"]', form);
  const price = qs<HTMLInputElement>('input[name="price"]', form)!;
  const error = qs(".form-error", form)!;
  const submit = qs<HTMLButtonElement>('button[type="submit"]', form)!;

  const showError = (message: string) => {
    error.textContent = message;
    error.hidden = !message;
  };

  const syncLimits = () => {
    const max = maxQuantity(product, readVariations(form));
    if (quantity) {
      quantity.max = String(Math.max(max, 1));
      const value = Math.min(Math.max(1, Number(quantity.value) || 1), Math.max(max, 1));
      quantity.value = String(value);
    }
    submit.disabled = max === 0 || isSoldOut(product);
  };

  form.addEventListener("change", (event) => {
    if ((event.target as Element).matches('select[name="variation"], input[name="quantity"]')) syncLimits();
  });
  // Clear errors while typing, not on blur: hiding the message on blur would
  // shift the button away from a click that's already under way.
  form.addEventListener("input", () => showError(""));
  form.addEventListener("click", (event) => {
    const step = (event.target as Element).closest<HTMLElement>("[data-step]");
    if (!step || !quantity) return;
    quantity.value = String((Number(quantity.value) || 1) + Number(step.dataset.step));
    syncLimits();
  });
  syncLimits();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const currency = currencyOf(band.get());
    const priceText = price.value.trim().replace(/^\$/, "");
    if (!/^\d+(\.\d{1,2})?$/.test(priceText)) {
      price.setAttribute("aria-invalid", "true");
      return showError("Enter a price like 35.00.");
    }
    const unitCents = Math.round(Number(priceText) * 100);
    if (unitCents < product.price) {
      price.setAttribute("aria-invalid", "true");
      return showError(`The minimum price is ${moneyText(product.price, currency)}.`);
    }
    price.removeAttribute("aria-invalid");

    const variations = readVariations(form);
    const wanted = quantity ? Math.max(1, Number(quantity.value) || 1) : 1;
    const { added } = cart.add(product, { variations, quantity: wanted, unitCents });
    if (added === 0) {
      return showError(
        isDigital(product)
          ? "This download is already in your cart."
          : "You already have all the available stock in your cart.",
      );
    }
    track("add_to_cart", {
      currency,
      value: (unitCents * added) / 100,
      items: [{ item_id: product.sku || product.id, item_name: product.title, price: unitCents / 100, quantity: added }],
    });
    onAdded(added, variations, unitCents);
  });
};

/** Dialog body confirming an add, with the next steps. */
const addedMarkup = (
  product: Merch,
  quantity: number,
  variations: Variations,
  unitCents: number,
  currency: string,
): SafeHtml => {
  const image = productImages(product)[0];
  const options = variationsLabel(variations);
  return html`<div class="added-to-cart">
    <div class="added-to-cart-item">
      ${image ? html`<img src="${image}" alt="" />` : ""}
      <div>
        <p class="added-to-cart-title">${icon("check", "icon-success")} ${quantity > 1 ? `${quantity} × ` : ""}${product.title}</p>
        ${options ? html`<p class="muted">${options}</p>` : ""}
        <p class="price">${money(unitCents, currency)}${quantity > 1 ? html` <span class="muted">each</span>` : ""}</p>
      </div>
    </div>
    <div class="dialog-actions">
      <button type="button" class="btn btn-secondary" data-close>Keep shopping</button>
      <a href="cart.html" class="btn btn-primary">View cart</a>
    </div>
  </div>`;
};

export const showAddedDialog = (
  product: Merch,
  quantity: number,
  variations: Variations,
  unitCents: number,
): void => {
  const dialog = openDialog({
    title: "Added to your cart",
    body: addedMarkup(product, quantity, variations, unitCents, currencyOf(band.get())),
  });
  qs("[data-close]", dialog.body)?.addEventListener("click", dialog.close);
  qs("a", dialog.body)?.addEventListener("click", dialog.close);
};

/** Opens the quick "add to cart" dialog for a product from a list. */
export const openAddToCartDialog = (productId: string): void => {
  const state = band.get();
  const product = findProduct(state.merch, productId);
  if (!product) return;
  const currency = currencyOf(state);
  const image = productImages(product)[0];
  const dialog = openDialog({
    title: "Add to cart",
    className: "dialog-add-to-cart",
    body: html`<div class="dialog-product">
        ${image ? html`<img src="${image}" alt="" />` : ""}
        <div>
          <p class="dialog-product-title">${product.title}</p>
          <p class="price">${money(product.price, currency)}</p>
        </div>
      </div>
      ${productOptionsForm(product, currency, "dialog")}`,
  });
  const form = qs<HTMLFormElement>("form", dialog.body)!;
  bindProductOptions(form, product, (quantity, variations, unitCents) => {
    render(dialog.body, addedMarkup(product, quantity, variations, unitCents, currency));
    const title = qs(".dialog-title", dialog.element);
    if (title) title.textContent = "Added to your cart";
    qs("[data-close]", dialog.body)?.addEventListener("click", dialog.close);
    qs("a", dialog.body)?.addEventListener("click", dialog.close);
  });
  qs<HTMLElement>("select, input", form)?.focus();
};

/** Handles "Add to cart" buttons on product cards inside root. */
export const bindAddToCartButtons = (root: HTMLElement): (() => void) => {
  const onClick = (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-add-to-cart]");
    if (button && !button.disabled) openAddToCartDialog(button.dataset.addToCart ?? "");
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
};
