import { loadStripe, type Stripe, type StripeCardNumberElement, type StripeElementStyle } from "@stripe/stripe-js";
import { api, errorMessage, type CreateOrderDto } from "../api/client";
import { isEmail, joinMailingList, newsletterEnabled } from "../components/forms";
import { icon } from "../components/icons";
import { band, currencyOf, type BandState } from "../data/band";
import { cart, requiresShipping, subtotalCents, unitCents, variationsLabel, type CartItem } from "../data/cart";
import { countries, countryName } from "../data/countries";
import { clearCustomer, emptyCustomer, loadCustomer, saveCustomer, type CustomerDetails } from "../data/customer";
import { findProduct, isDigital, productImages } from "../data/merch";
import { cartShippingCents, geocode, productShippingCents, type LatLng } from "../data/shipping";
import { track } from "../lib/analytics";
import { html, qs, qsa, render, type SafeHtml } from "../lib/dom";
import { money, moneyText } from "../lib/format";
import { lockNavigation } from "../site/router";
import { highlightColour } from "../site/theme";
import { renderIfChanged, type PageInit } from "./page";

type Step = "details" | "payment" | "done";

interface Receipt {
  orderId: string | null;
  paymentIntentId: string;
  email: string;
  totalCents: number;
  currency: string;
}

const cardStyle = (): StripeElementStyle => ({
  base: {
    color: "#ffffff",
    fontFamily: "Inter, sans-serif",
    fontSize: "16px",
    iconColor: highlightColour(),
    "::placeholder": { color: "#777777" },
  },
  invalid: { color: "#ff6b6b", iconColor: "#ff6b6b" },
});

const CONTACT_EMAIL = "quiversmusic@gmail.com";

let stripePromise: Promise<Stripe | null> | null = null;
let stripeKey = "";
const getStripe = (key: string): Promise<Stripe | null> => {
  if (!stripePromise || key !== stripeKey) {
    stripeKey = key;
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

const field = (
  name: keyof CustomerDetails,
  label: string,
  value: string,
  options: { type?: string; autocomplete?: string; required?: boolean } = {},
): SafeHtml => {
  const required = options.required ?? true;
  return html`<div class="field">
    <label for="checkout-${name}">${label}${required ? "" : html` <span class="muted">(optional)</span>`}</label>
    <input id="checkout-${name}" name="${name}" type="${options.type ?? "text"}" value="${value}"
      autocomplete="${options.autocomplete ?? "on"}" ${required ? "required" : ""} />
  </div>`;
};

const detailsMarkup = (customer: CustomerDetails, shipping: boolean, newsletter: boolean): SafeHtml =>
  html`<form class="checkout-form" novalidate data-details-form>
    <h2>Your details</h2>
    <div class="field-row">
      ${field("first_name", "First name", customer.first_name, { autocomplete: "given-name" })}
      ${field("last_name", "Last name", customer.last_name, { autocomplete: "family-name" })}
    </div>
    <div class="field-row">
      ${field("email_address", "Email", customer.email_address, { type: "email", autocomplete: "email" })}
      ${field("phone_number", "Phone", customer.phone_number, { type: "tel", autocomplete: "tel" })}
    </div>
    ${shipping
      ? html`<h2>Shipping address</h2>
          ${field("address_line_1", "Address", customer.address_line_1, { autocomplete: "address-line1" })}
          ${field("address_line_2", "Apartment, suite, etc.", customer.address_line_2, { autocomplete: "address-line2", required: false })}
          <div class="field-row">
            ${field("city", "City / suburb", customer.city, { autocomplete: "address-level2" })}
            ${field("state", "State / region", customer.state, { autocomplete: "address-level1" })}
          </div>
          <div class="field-row">
            ${field("postcode", "Postcode / ZIP", customer.postcode, { autocomplete: "postal-code" })}
            <div class="field">
              <label for="checkout-country">Country</label>
              <select id="checkout-country" name="country" autocomplete="country" required>
                ${countries().map((c) => html`<option value="${c.code}" ${c.code === customer.country ? "selected" : ""}>${c.name}</option>`)}
              </select>
            </div>
          </div>`
      : ""}
    <div class="field">
      <label for="checkout-message">Message for the band <span class="muted">(optional)</span></label>
      <textarea id="checkout-message" name="message" rows="3" placeholder="A special request, or just say hi">${customer.message}</textarea>
    </div>
    ${newsletter
      ? html`<label class="checkbox">
          <input type="checkbox" name="newsletter" />
          <span>Join our mailing list for new music, tour dates and merch</span>
        </label>`
      : ""}
    <p class="form-error" role="alert" hidden></p>
    <div class="checkout-actions">
      <a class="btn btn-secondary" href="cart.html">${icon("chevronLeft")} Cart</a>
      <button type="submit" class="btn btn-primary">Continue to payment</button>
    </div>
  </form>`;

const addressLine = (c: CustomerDetails): string =>
  [c.address_line_1, c.address_line_2, c.city, c.state, c.postcode, countryName(c.country)]
    .filter(Boolean)
    .join(", ");

const paymentMarkup = (customer: CustomerDetails, shipping: boolean, total: SafeHtml): SafeHtml =>
  html`<div class="checkout-form" data-payment>
    <h2>Payment</h2>
    <div class="checkout-recap">
      <div>
        <p>${customer.first_name} ${customer.last_name} · ${customer.email_address}</p>
        ${shipping ? html`<p class="muted">Ship to ${addressLine(customer)}</p>` : ""}
      </div>
      <button type="button" class="link-button" data-back>Edit</button>
    </div>
    <div class="field">
      <label for="card-number">Card number</label>
      <div class="stripe-field" id="card-number"></div>
    </div>
    <div class="field-row">
      <div class="field"><label for="card-expiry">Expiry</label><div class="stripe-field" id="card-expiry"></div></div>
      <div class="field"><label for="card-cvc">CVC</label><div class="stripe-field" id="card-cvc"></div></div>
    </div>
    <p class="form-error" role="alert" hidden></p>
    <p class="alert alert-info">${icon("lock")} Payments are processed securely by Stripe. Please keep this page open until your payment is complete.</p>
    <div class="checkout-actions">
      <button type="button" class="btn btn-secondary" data-back>${icon("chevronLeft")} Back</button>
      <button type="button" class="btn btn-primary" data-pay disabled>
        <span class="spinner" hidden></span><span data-pay-label>Pay ${total}</span>
      </button>
    </div>
  </div>`;

const doneMarkup = (receipt: Receipt): SafeHtml =>
  receipt.orderId
    ? html`<div class="checkout-done">
        <div class="checkout-done-icon">${icon("check")}</div>
        <h2>Thank you! Your order is confirmed.</h2>
        <p>We've received your payment of ${money(receipt.totalCents, receipt.currency)}. A confirmation is on its way to <strong>${receipt.email}</strong>, and you'll hear from us when your order ships.</p>
        <p class="muted">Order reference: ${receipt.orderId}</p>
        <a class="btn btn-primary" href="merch.html" data-merch-link>Back to the store</a>
      </div>`
    : html`<div class="checkout-done">
        <div class="checkout-done-icon checkout-done-warning">!</div>
        <h2>Your payment went through, but we couldn't save your order</h2>
        <p>Sorry about that. Please email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with the payment reference below and we'll sort it out.</p>
        <p class="checkout-reference">${receipt.paymentIntentId}</p>
      </div>`;

const summaryMarkup = (items: CartItem[], state: BandState, shippingCents: number | null): SafeHtml => {
  const currency = currencyOf(state);
  const subtotal = subtotalCents(items, state.merch);
  const needsShipping = requiresShipping(items);
  return html`<h2>Order summary</h2>
    <ul class="summary-items">
      ${items.map((item) => {
        const product = findProduct(state.merch, item.productId);
        if (!product) return "";
        const image = productImages(product)[0];
        const options = variationsLabel(item.variations);
        return html`<li class="summary-item">
          <span class="summary-item-image">${image ? html`<img src="${image}" alt="" />` : ""}<span class="summary-item-qty">${item.quantity}</span></span>
          <span class="summary-item-info"><span>${product.title}</span>${options ? html`<span class="muted">${options}</span>` : ""}</span>
          <span class="price">${money(unitCents(item, product) * item.quantity, currency)}</span>
        </li>`;
      })}
    </ul>
    <div class="summary-row"><span>Subtotal</span><span class="price">${money(subtotal, currency)}</span></div>
    ${needsShipping
      ? html`<div class="summary-row ${shippingCents === null ? "muted" : ""}"><span>Shipping</span>
          <span class="${shippingCents === null ? "" : "price"}">${shippingCents === null ? "Calculated from your address" : money(shippingCents, currency)}</span></div>`
      : ""}
    <div class="summary-row summary-total"><span>Total</span><span class="price">${money(subtotal + (shippingCents ?? 0), currency)}</span></div>`;
};

/** Creates the order, retrying briefly: the customer has already paid. */
const createOrder = async (order: CreateOrderDto): Promise<string | null> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await api.orderControllerCreate(order);
      if (response.data?.id) return response.data.id;
    } catch {
      // Try again below.
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  return null;
};

export const checkout: PageInit = ({ main, cleanup }) => {
  const root = qs("[data-checkout]", main);
  if (!root) return;

  let step: Step = "details";
  let customer = loadCustomer();
  let geo: LatLng | null = null;
  let shippingCents: number | null = null;
  let receipt: Receipt | null = null;
  let card: StripeCardNumberElement | null = null;
  let stripe: Stripe | null = null;
  let paying = false;

  void band.refresh(0);
  render(
    root,
    html`<ol class="checkout-steps" aria-label="Checkout steps">
        <li data-step="details">Details</li><li data-step="payment">Payment</li><li data-step="done">Done</li>
      </ol>
      <div class="checkout-layout">
      <div class="checkout-main">
        <div data-panel></div>
      </div>
      <aside class="summary-card checkout-summary" data-summary></aside>
    </div>`,
  );
  const panel = qs("[data-panel]", root)!;
  const summary = qs("[data-summary]", root)!;
  const layout = qs(".checkout-layout", root)!;

  const setError = (message: string) => {
    const error = qs(".form-error", panel);
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
  };

  const unloadGuard = (event: BeforeUnloadEvent) => {
    event.preventDefault();
  };
  const setPaying = (value: boolean) => {
    paying = value;
    lockNavigation(value ? "Please wait while your payment is processing." : null);
    if (value) window.addEventListener("beforeunload", unloadGuard);
    else window.removeEventListener("beforeunload", unloadGuard);
    const pay = qs<HTMLButtonElement>("[data-pay]", panel);
    if (pay) {
      pay.disabled = value;
      qs(".spinner", pay)!.hidden = !value;
    }
    qsa<HTMLButtonElement>("[data-back]", panel).forEach((b) => (b.disabled = value));
  };
  cleanup(() => setPaying(false));

  const totals = () => {
    const state = band.get();
    const { items } = cart.get();
    const subtotal = subtotalCents(items, state.merch);
    return { state, items, subtotal, total: subtotal + (shippingCents ?? 0), currency: currencyOf(state) };
  };

  const showStep = (next: Step) => {
    step = next;
    card = null;
    qsa("[data-step]", root).forEach((li) => {
      const order = ["details", "payment", "done"];
      li.classList.toggle("is-active", li.dataset.step === step);
      li.classList.toggle("is-complete", order.indexOf(li.dataset.step ?? "") < order.indexOf(step));
    });
    layout.classList.toggle("is-done", step === "done");
    const { state, items, total, currency } = totals();
    if (step === "details") {
      render(panel, detailsMarkup(customer, requiresShipping(items), newsletterEnabled(state)));
      bindDetails();
    } else if (step === "payment") {
      render(panel, paymentMarkup(customer, requiresShipping(items), money(total, currency)));
      void mountCard();
    } else if (receipt) {
      render(panel, doneMarkup(receipt));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const bindDetails = () => {
    const form = qs<HTMLFormElement>("[data-details-form]", panel)!;
    const read = (): CustomerDetails => {
      const data = new FormData(form);
      const next = { ...customer };
      for (const key of Object.keys(next) as (keyof CustomerDetails)[]) {
        const value = data.get(key);
        if (typeof value === "string") next[key] = key === "message" ? value : value.trim();
      }
      return next;
    };
    form.addEventListener("input", () => {
      customer = read();
      saveCustomer(customer);
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      customer = read();
      saveCustomer(customer);

      const invalid = qsa<HTMLInputElement | HTMLSelectElement>("[required]", form).filter((input) => !input.value.trim());
      const email = qs<HTMLInputElement>('[name="email_address"]', form)!;
      if (email.value && !isEmail(email.value)) invalid.push(email);
      qsa("[aria-invalid]", form).forEach((el) => el.removeAttribute("aria-invalid"));
      invalid.forEach((el) => el.setAttribute("aria-invalid", "true"));
      if (invalid.length) {
        setError(invalid.length === 1 && invalid[0] === email && email.value ? "Enter a valid email address." : "Please fill in the highlighted fields.");
        return invalid[0].focus();
      }

      const { state, items } = totals();
      if (!state.about?.stripe_public_key) {
        return setError("Online payments aren't available right now. Please contact us to order.");
      }
      const submit = qs<HTMLButtonElement>('button[type="submit"]', form)!;
      submit.disabled = true;
      setError("");
      await band.refresh(0);
      if (!band.get().fresh) {
        submit.disabled = false;
        return setError("We couldn't reach the store to confirm prices and stock. Please try again.");
      }
      cart.prune(band.get().merch);

      if (qs<HTMLInputElement>('[name="newsletter"]', form)?.checked) {
        joinMailingList(customer.email_address).catch(() => undefined);
      }
      geo = requiresShipping(items) ? await geocode(addressLine(customer)) : null;
      shippingCents = requiresShipping(items) ? cartShippingCents(cart.get().items, band.get().merch, geo) : 0;
      track("begin_checkout", { currency: currencyOf(state), value: totals().total / 100 });
      drawSummary();
      showStep("payment");
    });
  };

  const mountCard = async () => {
    const { state } = totals();
    try {
      stripe = await getStripe(state.about?.stripe_public_key ?? "");
    } catch {
      stripe = null;
    }
    if (step !== "payment") return;
    if (!stripe) return setError("The payment form couldn't load. Check your connection and try again.");
    const elements = stripe.elements({
      fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" }],
    });
    const options = { style: cardStyle() };
    card = elements.create("cardNumber", { ...options, showIcon: true });
    const expiry = elements.create("cardExpiry", options);
    const cvc = elements.create("cardCvc", options);
    card.mount("#card-number");
    expiry.mount("#card-expiry");
    cvc.mount("#card-cvc");
    const showCardError = (event: { error?: { message?: string } }) => setError(event.error?.message ?? "");
    card.on("change", showCardError);
    expiry.on("change", showCardError);
    cvc.on("change", showCardError);
    const pay = qs<HTMLButtonElement>("[data-pay]", panel);
    if (pay) pay.disabled = false;
  };

  const fail = (message: string) => {
    setPaying(false);
    setError(`Your payment wasn't successful. ${message}`);
    track("payment_failed");
  };

  const pay = async () => {
    if (paying || !stripe || !card) return;
    const { state, items, total, currency } = totals();
    const userId = state.userId;
    if (!items.length || !userId) return;
    setError("");
    setPaying(true);

    const shipping = requiresShipping(items);
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card,
      billing_details: {
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email_address,
        phone: customer.phone_number,
        address: shipping
          ? {
              line1: customer.address_line_1,
              line2: customer.address_line_2 || undefined,
              city: customer.city,
              state: customer.state,
              postal_code: customer.postcode,
              country: customer.country,
            }
          : undefined,
      },
    });
    if (error || !paymentMethod) return fail(error?.message ?? "Please try again.");

    let paymentIntentId = "";
    try {
      let result = (
        await api.paymentsControllerCreate({
          PaymentMethodId: paymentMethod.id,
          PaymentIntentId: "",
          AmountCents: total,
          UserId: userId,
          Currency: "",
        })
      ).data;
      // The card needs another step, such as 3-D Secure.
      if (!result.Success && result.RequiresAction) {
        const action = await stripe.handleCardAction(result.ClientSecret);
        if (action.error || !action.paymentIntent) return fail(action.error?.message ?? "Please try again.");
        result = (
          await api.paymentsControllerCreate({
            PaymentMethodId: "",
            PaymentIntentId: action.paymentIntent.id,
            AmountCents: total,
            UserId: userId,
            Currency: "",
          })
        ).data;
      }
      if (!result.Success) return fail(result.Message || "Please try again.");
      paymentIntentId = result.PaymentIntentId;
    } catch (err) {
      return fail(errorMessage(err));
    }

    // Paid. Record the order; shipping is charged once, on the item that costs most to post.
    const shippingItem = items.reduce<{ id: string; cents: number }>((best, item) => {
      const product = findProduct(state.merch, item.productId);
      const cents = product ? productShippingCents(product, geo) : 0;
      return cents > best.cents ? { id: item.itemId, cents } : best;
    }, { id: "", cents: 0 });

    const order: CreateOrderDto = {
      created_at: new Date().toISOString(),
      shipped: false,
      shipped_at: "",
      order_total_cents: total,
      customer_first_name: customer.first_name,
      customer_last_name: customer.last_name,
      customer_email_address: customer.email_address,
      customer_phone_number: customer.phone_number,
      customer_address_line_1: shipping ? customer.address_line_1 : "",
      customer_address_line_2: shipping ? customer.address_line_2 : "",
      customer_city: shipping ? customer.city : "",
      customer_state: shipping ? customer.state : "",
      customer_postcode: shipping ? customer.postcode : "",
      customer_country: shipping ? countryName(customer.country) : "",
      card_last_four: paymentMethod.card?.last4 ?? "unknown",
      card_brand: paymentMethod.card?.brand ?? "unknown",
      notes: "",
      notified_order_created: false,
      notified_order_shipped: false,
      stripe_payment_intent_id: paymentIntentId,
      refunded: false,
      refunded_at: "",
      completed: false,
      completed_at: "",
      verified: false,
      custom_message: customer.message.trim(),
      address_latitude: geo?.lat ?? 0,
      address_longitude: geo?.lng ?? 0,
      user_id: userId,
      items: items.flatMap((item) => {
        const product = findProduct(state.merch, item.productId);
        if (!product) return [];
        const unit = unitCents(item, product);
        const postage = item.itemId === shippingItem.id ? shippingItem.cents : 0;
        return [{
          title: product.title,
          sku: product.sku,
          quantity: item.quantity,
          subtitle: isDigital(product)
            ? moneyText(unit, currency)
            : `${item.quantity}x @ ${moneyText(unit, currency)} each + ${moneyText(postage, currency)} shipping`,
          subtotal_cents: unit * item.quantity + postage,
          variations: Object.entries(item.variations).map(([label, option]) => `${label}: ${option}`),
          type: item.type,
        }];
      }),
    };

    const orderId = await createOrder(order);
    if (orderId) {
      // Emails the band and the customer, then double-checks the total.
      await api
        .notificationsControllerOrder({
          OrderId: orderId,
          NotificationType: 1,
          ActionDate: "",
          UserId: userId,
          SendShipNotification: false,
          AddMessage: false,
          Message: "",
          AddTrackingNo: false,
          TrackingNo: "",
        })
        .catch(() => undefined);
      api.orderControllerVerify({ OrderId: orderId, UserId: userId }).catch(() => undefined);
    }

    track("purchase", { transaction_id: orderId ?? paymentIntentId, currency, value: total / 100, shipping: (shippingCents ?? 0) / 100 });
    receipt = { orderId, paymentIntentId, email: customer.email_address, totalCents: total, currency };
    setPaying(false);
    // Show the receipt before emptying the cart, so the change isn't
    // mistaken for the cart being edited mid-checkout.
    showStep("done");
    cart.clear();
    customer = emptyCustomer();
    clearCustomer();
  };

  panel.addEventListener("click", (event) => {
    const target = event.target as Element;
    if (target.closest("[data-back]") && !paying) showStep("details");
    if (target.closest("[data-pay]")) void pay();
  });

  const drawSummary = () => {
    const state = band.get();
    const { items } = cart.get();
    if (step === "done") return;
    const empty = qs("[data-checkout-empty]", main);
    layout.hidden = items.length === 0;
    qs(".checkout-steps", root)!.hidden = items.length === 0;
    if (empty) empty.hidden = items.length > 0;
    if (!items.length) return;
    renderIfChanged(summary, summaryMarkup(items, state, requiresShipping(items) ? shippingCents : 0));
  };

  // Anything that changes the cart's contents means shipping must be worked out again.
  let cartKey = JSON.stringify(cart.get().items);
  cleanup(
    cart.subscribe(({ items }) => {
      const key = JSON.stringify(items);
      if (step === "done") return;
      if (key !== cartKey && step === "payment") {
        cartKey = key;
        shippingCents = null;
        showStep("details");
      }
      cartKey = key;
      drawSummary();
    }),
  );
  cleanup(band.subscribe(drawSummary));
  showStep("details");

};
