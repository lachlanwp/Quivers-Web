import { bindContactForm, contactFormEnabled } from "../components/forms";
import { band } from "../data/band";
import { html, qs, raw, type SafeHtml } from "../lib/dom";
import { sanitizeHtml } from "../lib/sanitize";
import { observeFadeIns } from "../site/effects";
import { renderIfChanged, type PageInit } from "./page";

const text = (node: Node): string => (node.textContent ?? "").replace(/\s+/g, " ").trim();

/** A line that's all bold ("Enquiries:") or a heading starts a new card. */
const headingOf = (node: Node): string | null => {
  if (!(node instanceof Element) || node.querySelector("a")) return null;
  const all = text(node);
  if (!all) return null;
  const bold = Array.from(node.querySelectorAll("strong, b"))
    .filter((el) => !el.parentElement?.closest("strong, b"))
    .map(text)
    .join(" ")
    .trim();
  const isHeading = /^H[1-6]$/.test(node.tagName) || (node.tagName === "P" && bold === all);
  return isHeading ? all.replace(/\s*:$/, "") : null;
};

/** Lets long email addresses wrap after the "@", like the page's own copy. */
const breakEmails = (root: ParentNode): void => {
  for (const link of Array.from(root.querySelectorAll('a[href^="mailto:"]'))) {
    for (const node of Array.from(link.childNodes)) {
      const at = node.nodeType === Node.TEXT_NODE ? (node.textContent ?? "").indexOf("@") : -1;
      if (at < 0) continue;
      const rest = (node as Text).splitText(at + 1);
      link.insertBefore(document.createElement("wbr"), rest);
    }
  }
};

/**
 * The contact details from the admin (one block of rich text) as the page's
 * cards: each bold line starts a card, headed by that line. Null if empty.
 */
const contactCards = (dirty: string | null | undefined): SafeHtml | null => {
  const template = document.createElement("template");
  template.innerHTML = sanitizeHtml(dirty).value;
  breakEmails(template.content);

  const cards: { heading: string | null; body: string[] }[] = [];
  for (const node of Array.from(template.content.childNodes)) {
    if (!text(node)) continue; // blank lines
    const heading = headingOf(node);
    if (heading !== null) {
      cards.push({ heading, body: [] });
      continue;
    }
    if (!cards.length) cards.push({ heading: null, body: [] });
    const markup = node instanceof Element ? node.outerHTML : html`<p>${node.textContent}</p>`.value;
    cards[cards.length - 1].body.push(markup);
  }

  const shown = cards.filter((card) => card.body.length);
  if (!shown.length) return null;
  // The body is markup from sanitizeHtml above.
  return html`${shown.map(
    (card) => html`<div class="contact-section">
      ${card.heading ? html`<h3>${card.heading}</h3>` : ""}
      ${raw(card.body.join("\n"))}
    </div>`,
  )}`;
};

export const contact: PageInit = ({ main, cleanup }) => {
  // The details from the API replace the page's own cards.
  const details = qs("[data-contact-details]", main);
  if (details) {
    cleanup(
      band.subscribe((state) => {
        const cards = contactCards(state.contact?.contact_html);
        if (cards && renderIfChanged(details, cards)) observeFadeIns(details);
      }),
    );
  }

  const section = qs("[data-contact-form-section]", main);
  const form = qs<HTMLFormElement>("[data-contact-form]", main);
  if (!section || !form) return;
  cleanup(bindContactForm(form));
  cleanup(band.subscribe((state) => (section.hidden = !contactFormEnabled(state))));
};
