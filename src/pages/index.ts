import { about } from "./about";
import { cartPage } from "./cart";
import { checkout } from "./checkout";
import { contact } from "./contact";
import { home } from "./home";
import { merch } from "./merch";
import { music } from "./music";
import { paymentLink } from "./order";
import type { PageInit } from "./page";
import { product } from "./product";

/** Page code by <body data-page="...">. */
export const pages: Record<string, PageInit> = {
  home,
  about,
  music,
  merch,
  product,
  cart: cartPage,
  checkout,
  order: paymentLink,
  contact,
};
