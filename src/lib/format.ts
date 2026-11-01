import { html, type SafeHtml } from "./dom";

const SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  CHF: "Fr ",
  CNY: "¥",
  JPY: "¥",
  INR: "₹",
  NOK: "kr ",
  SEK: "kr ",
};

export const currencySymbol = (currency: string): string =>
  SYMBOLS[currency.toUpperCase()] ?? "$";

/** "$35.00" for 3500 cents. */
export const moneyText = (cents: number, currency: string): string =>
  `${currencySymbol(currency)}${(Math.round(cents) / 100).toFixed(2)}`;

/** "$35.00 AUD", with the currency code styled smaller. */
export const money = (cents: number, currency: string): SafeHtml =>
  html`${moneyText(cents, currency)}${currency
    ? html` <span class="currency">${currency.toUpperCase()}</span>`
    : ""}`;

export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

/** "3:07" for 187 seconds. */
export const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};
