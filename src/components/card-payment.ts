import { loadStripe, type Stripe, type StripeCardNumberElement, type StripeElementStyle } from "@stripe/stripe-js";
import { api, errorMessage } from "../api/client";
import { html, type SafeHtml } from "../lib/dom";
import { highlightColour } from "../site/theme";

// Card payments through Stripe and the API (POST /payments), shared by
// checkout and payment links (order.html).

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

let stripePromise: Promise<Stripe | null> | null = null;
let stripeKey = "";
export const getStripe = (key: string): Promise<Stripe | null> => {
  if (!stripePromise || key !== stripeKey) {
    stripeKey = key;
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

/** Places for the card number, expiry and CVC fields (see mountCardFields). */
export const cardFieldsMarkup = (): SafeHtml =>
  html`<div class="field">
      <label for="card-number">Card number</label>
      <div class="stripe-field" id="card-number"></div>
    </div>
    <div class="field-row">
      <div class="field"><label for="card-expiry">Expiry</label><div class="stripe-field" id="card-expiry"></div></div>
      <div class="field"><label for="card-cvc">CVC</label><div class="stripe-field" id="card-cvc"></div></div>
    </div>`;

/**
 * Mounts Stripe's card fields into cardFieldsMarkup(), which must be on the
 * page. Returns the card number field, which createPaymentMethod needs.
 */
export const mountCardFields = (stripe: Stripe, onError: (message: string) => void): StripeCardNumberElement => {
  const elements = stripe.elements({
    fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" }],
  });
  const options = { style: cardStyle() };
  const card = elements.create("cardNumber", { ...options, showIcon: true });
  const expiry = elements.create("cardExpiry", options);
  const cvc = elements.create("cardCvc", options);
  card.mount("#card-number");
  expiry.mount("#card-expiry");
  cvc.mount("#card-cvc");
  const showCardError = (event: { error?: { message?: string } }) => onError(event.error?.message ?? "");
  card.on("change", showCardError);
  expiry.on("change", showCardError);
  cvc.on("change", showCardError);
  return card;
};

export interface ChargeRequest {
  paymentMethodId: string;
  amountCents: number;
  /** The band's user ID: the API charges with that account's Stripe key. */
  userId: string;
  /** e.g. "AUD". Empty for the band's own currency. */
  currency: string;
}

export type ChargeResult = { ok: true; paymentIntentId: string } | { ok: false; message: string };

/** Charges a card payment method, including any extra step the card needs, such as 3-D Secure. */
export const chargeCard = async (stripe: Stripe, request: ChargeRequest): Promise<ChargeResult> => {
  const body = {
    PaymentMethodId: request.paymentMethodId,
    PaymentIntentId: "",
    AmountCents: request.amountCents,
    UserId: request.userId,
    Currency: request.currency,
  };
  try {
    let result = (await api.paymentsControllerCreate(body)).data;
    if (!result.Success && result.RequiresAction) {
      const action = await stripe.handleCardAction(result.ClientSecret);
      if (action.error || !action.paymentIntent) {
        return { ok: false, message: action.error?.message ?? "Please try again." };
      }
      result = (
        await api.paymentsControllerCreate({ ...body, PaymentMethodId: "", PaymentIntentId: action.paymentIntent.id })
      ).data;
    }
    if (!result.Success) return { ok: false, message: result.Message || "Please try again." };
    return { ok: true, paymentIntentId: result.PaymentIntentId };
  } catch (err) {
    return { ok: false, message: errorMessage(err) };
  }
};
