import type { Stripe, StripeCardNumberElement } from "@stripe/stripe-js";
import { api, type CompleteCustomOrder, type GetCustomOrder } from "../api/client";
import { cardFieldsMarkup, chargeCard, getStripe, mountCardFields } from "../components/card-payment";
import { icon } from "../components/icons";
import { config } from "../config";
import { band, currencyOf } from "../data/band";
import { track } from "../lib/analytics";
import { html, qs, qsa, render, type SafeHtml } from "../lib/dom";
import { currencySymbol, money } from "../lib/format";
import { lockNavigation } from "../site/router";
import type { PageInit } from "./page";

// Payment links ("custom orders" in the API). In the admin the band creates
// one for an amount, with an optional note, and gets a QR code for
// order.html?id=<custom order id>. The customer scans it, can add a tip and
// pays by card. A link stops working once it's paid, refunded or deleted.

/** Tip buttons, in cents. */
const TIPS_CENTS = [100, 500, 2000];

type State =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "error" }
  | { kind: "unavailable" }
  | { kind: "ready"; order: GetCustomOrder }
  | { kind: "paid"; order: GetCustomOrder; totalCents: number }
  | { kind: "unrecorded"; paymentIntentId: string };

type Lookup = { order: GetCustomOrder } | "missing" | "error";

const fetchOrder = async (id: string): Promise<Lookup> => {
  try {
    // The API answers with an empty body when there's no unpaid order with this ID.
    const { data } = await api.customOrderControllerGetCustomOrder(id);
    return data?.id ? { order: data } : "missing";
  } catch {
    return "error";
  }
};

/** Marks the order paid, retrying briefly: the customer has already paid. */
const completeOrder = async (details: CompleteCustomOrder): Promise<boolean> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    try {
      const response = await api.customOrderControllerComplete(details);
      if (response.data?.completed) return true;
    } catch {
      // Try again.
    }
  }
  return false;
};

const currencyOfOrder = (order: GetCustomOrder): string => order.currency_code || currencyOf(band.get());

const notice = (title: string, text: string, action: SafeHtml | "" = ""): SafeHtml =>
  html`<div class="empty-state">
    <h2>${title}</h2>
    <p>${text}</p>
    ${action}
  </div>`;

const paymentMarkup = (order: GetCustomOrder): SafeHtml => {
  const currency = currencyOfOrder(order);
  const symbol = currencySymbol(currency);
  const note = (order.customer_note ?? "").trim();
  return html`<div class="checkout-form" data-payment>
    ${note
      ? html`<div class="payment-note">
          <p class="muted">Message from Quivers</p>
          <p class="payment-note-text">${note}</p>
        </div>`
      : ""}
    <div class="summary-row"><span>Amount due</span><span class="price">${money(order.order_total_cents, currency)}</span></div>
    <div class="payment-tip">
      <span>Add a tip?</span>
      <div class="tip-options">
        ${TIPS_CENTS.map(
          (cents) => html`<button type="button" class="btn btn-secondary btn-sm" data-tip="${cents}"
            aria-label="Add a ${symbol}${cents / 100} tip">+${symbol}${cents / 100}</button>`,
        )}
      </div>
    </div>
    <div class="summary-row" data-tip-row hidden>
      <span>Tip <button type="button" class="link-button" data-clear-tip>Remove</button></span>
      <span class="price" data-tip-amount></span>
    </div>
    <div class="summary-row summary-total"><span>Total</span><span class="price" data-total>${money(order.order_total_cents, currency)}</span></div>
    <h2>Card details</h2>
    ${cardFieldsMarkup()}
    <p class="form-error" role="alert" hidden></p>
    <p class="alert alert-info">${icon("lock")} Payments are processed securely by Stripe. Please keep this page open until your payment is complete.</p>
    <button type="button" class="btn btn-primary btn-block" data-pay disabled>
      <span class="spinner" hidden></span><span data-pay-label>Pay ${money(order.order_total_cents, currency)}</span>
    </button>
  </div>`;
};

const paidMarkup = (order: GetCustomOrder, totalCents: number): SafeHtml =>
  html`<div class="checkout-done">
    <div class="checkout-done-icon">${icon("check")}</div>
    <h2>Thank you! Your payment was successful.</h2>
    <p>We've received your payment of ${money(totalCents, currencyOfOrder(order))}.</p>
    <p class="muted">Reference: ${order.id}</p>
    <a class="btn btn-primary" href="index.html">Back to the site</a>
  </div>`;

const unrecordedMarkup = (paymentIntentId: string): SafeHtml =>
  html`<div class="checkout-done">
    <div class="checkout-done-icon checkout-done-warning">!</div>
    <h2>Your payment went through, but we couldn't record it</h2>
    <p>Sorry about that. Please don't pay again: email <a href="mailto:${config.contactEmail}">${config.contactEmail}</a> with the payment reference below and we'll sort it out.</p>
    <p class="checkout-reference">${paymentIntentId}</p>
  </div>`;

export const paymentLink: PageInit = ({ main, cleanup }) => {
  const root = qs("[data-payment-link]", main);
  if (!root) return;

  const orderId = new URLSearchParams(location.search).get("id")?.trim() ?? "";
  let state: State = { kind: "loading" };
  let tipCents = 0;
  let stripe: Stripe | null = null;
  let card: StripeCardNumberElement | null = null;
  let paying = false;
  let active = true;
  cleanup(() => (active = false));

  const setError = (message: string) => {
    const error = qs(".form-error", root);
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
  };

  const unloadGuard = (event: BeforeUnloadEvent) => event.preventDefault();
  const setPaying = (value: boolean) => {
    paying = value;
    lockNavigation(value ? "Please wait while your payment is processing." : null);
    if (value) window.addEventListener("beforeunload", unloadGuard);
    else window.removeEventListener("beforeunload", unloadGuard);
    const pay = qs<HTMLButtonElement>("[data-pay]", root);
    if (pay) {
      pay.disabled = value;
      qs(".spinner", pay)!.hidden = !value;
    }
    qsa<HTMLButtonElement>("[data-tip], [data-clear-tip]", root).forEach((b) => (b.disabled = value));
  };
  cleanup(() => setPaying(false));

  // Updates the tip and totals without redrawing the card fields.
  const drawTotals = (order: GetCustomOrder) => {
    const currency = currencyOfOrder(order);
    const total = order.order_total_cents + tipCents;
    qs("[data-tip-row]", root)!.hidden = tipCents === 0;
    render(qs("[data-tip-amount]", root)!, money(tipCents, currency));
    render(qs("[data-total]", root)!, money(total, currency));
    render(qs("[data-pay-label]", root)!, html`Pay ${money(total, currency)}`);
  };

  const show = (next: State) => {
    state = next;
    card = null;
    switch (next.kind) {
      case "loading":
        render(root, html`<p class="loading-message">Loading payment…</p>`);
        break;
      case "invalid":
        render(root, notice(
          "This payment link isn't valid",
          "It may have been paid already, or it has expired. Please ask us for a new link.",
        ));
        break;
      case "error":
        render(root, notice(
          "We couldn't load this payment",
          "Check your connection and try again.",
          html`<button type="button" class="btn btn-primary" data-retry>Try again</button>`,
        ));
        break;
      case "unavailable":
        render(root, notice(
          "Online payments aren't available right now",
          "Sorry about that. Please ask us for another way to pay.",
        ));
        break;
      case "ready":
        render(root, paymentMarkup(next.order));
        void mountCard();
        break;
      case "paid":
        render(root, paidMarkup(next.order, next.totalCents));
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "unrecorded":
        render(root, unrecordedMarkup(next.paymentIntentId));
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
    }
  };

  const load = async () => {
    if (!orderId) return show({ kind: "invalid" });
    show({ kind: "loading" });
    // The band's data gives the Stripe key and user ID the payment needs.
    const [lookup] = await Promise.all([fetchOrder(orderId), band.refresh(60_000)]);
    if (!active) return;
    const { about, userId } = band.get();
    if (lookup === "error" || !about) return show({ kind: "error" });
    // Only the band's own links can be paid here.
    if (lookup === "missing" || lookup.order.user_id !== userId) return show({ kind: "invalid" });
    if (!about.stripe_public_key) return show({ kind: "unavailable" });
    tipCents = 0;
    show({ kind: "ready", order: lookup.order });
  };

  const mountCard = async () => {
    try {
      stripe = await getStripe(band.get().about?.stripe_public_key ?? "");
    } catch {
      stripe = null;
    }
    if (!active || state.kind !== "ready") return;
    if (!stripe) return setError("The payment form couldn't load. Check your connection and try again.");
    card = mountCardFields(stripe, setError);
    const pay = qs<HTMLButtonElement>("[data-pay]", root);
    if (pay) pay.disabled = false;
  };

  const fail = (message: string) => {
    setPaying(false);
    setError(`Your payment wasn't successful. ${message}`);
    track("payment_failed", { source: "payment_link" });
  };

  const pay = async () => {
    if (paying || !stripe || !card || state.kind !== "ready") return;
    const { order } = state;
    const userId = band.get().userId;
    if (!userId) return;
    setError("");
    setPaying(true);

    const { error, paymentMethod } = await stripe.createPaymentMethod({ type: "card", card });
    if (error || !paymentMethod) return fail(error?.message ?? "Please try again.");

    const tip = tipCents;
    const total = order.order_total_cents + tip;
    const currency = currencyOfOrder(order);
    const charge = await chargeCard(stripe, {
      paymentMethodId: paymentMethod.id,
      amountCents: total,
      userId,
      currency: order.currency_code,
    });
    if (!charge.ok) return fail(charge.message);

    // Paid. Mark the link paid (so it can't be paid twice), then email the band.
    const recorded = await completeOrder({
      id: order.id,
      stripe_payment_intent_id: charge.paymentIntentId,
      card_last_four: paymentMethod.card?.last4 ?? "unknown",
      card_brand: paymentMethod.card?.brand ?? "unknown",
      extra_tip_cents: tip,
    });
    if (recorded) {
      await api.notificationsControllerCustomOrder({ OrderId: order.id, UserId: userId }).catch(() => undefined);
    }
    track("payment_link_paid", { transaction_id: order.id, currency, value: total / 100, tip: tip / 100 });
    setPaying(false);
    show(recorded ? { kind: "paid", order, totalCents: total } : { kind: "unrecorded", paymentIntentId: charge.paymentIntentId });
  };

  root.addEventListener("click", (event) => {
    const target = event.target as Element;
    if (target.closest("[data-retry]")) return void load();
    if (state.kind !== "ready" || paying) return;
    const tip = target.closest<HTMLElement>("[data-tip]");
    if (tip) {
      tipCents += Number(tip.dataset.tip) || 0;
      drawTotals(state.order);
    } else if (target.closest("[data-clear-tip]")) {
      tipCents = 0;
      drawTotals(state.order);
      qs<HTMLButtonElement>("[data-tip]", root)?.focus();
    } else if (target.closest("[data-pay]")) {
      void pay();
    }
  });

  void load();
};
