import { bindContactForm, contactFormEnabled } from "../components/forms";
import { band } from "../data/band";
import { qs } from "../lib/dom";
import type { PageInit } from "./page";

export const contact: PageInit = ({ main, cleanup }) => {
  const section = qs("[data-contact-form-section]", main);
  const form = qs<HTMLFormElement>("[data-contact-form]", main);
  if (!section || !form) return;
  cleanup(bindContactForm(form));
  cleanup(band.subscribe((state) => (section.hidden = !contactFormEnabled(state))));
};
