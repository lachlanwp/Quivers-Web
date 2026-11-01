import DOMPurify from "dompurify";
import { SafeHtml } from "./dom";

// Rich text from the API (bio, product descriptions) is written in the
// MusicPowered admin. Allow the same formatting the MusicPowered site does.
const ALLOWED_TAGS = [
  "strong", "b", "em", "i", "u", "span", "p", "br", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "pre", "blockquote", "a",
];
const ALLOWED_ATTR = ["style", "href", "target"];

// Inline styles from the admin's editor were written for a light page; keep
// only alignment and emphasis so colours and fonts can't clash with the site.
const ALLOWED_STYLES = new Set(["text-align", "font-weight", "font-style", "text-decoration"]);

DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName !== "style") return;
  data.attrValue = data.attrValue
    .split(";")
    .map((rule) => rule.trim())
    .filter((rule) => ALLOWED_STYLES.has(rule.split(":")[0]?.trim().toLowerCase()))
    .join("; ");
  if (!data.attrValue) data.keepAttr = false;
});

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    if (node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    } else {
      node.removeAttribute("target");
    }
  }
});

export const sanitizeHtml = (dirty: string | null | undefined): SafeHtml =>
  new SafeHtml(
    DOMPurify.sanitize(dirty ?? "", {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ADD_ATTR: ["rel"],
    }),
  );

/** True when HTML from the API has visible text in it. */
export const hasText = (dirty: string | null | undefined): boolean => {
  const div = document.createElement("div");
  div.innerHTML = sanitizeHtml(dirty).value;
  return (div.textContent ?? "").trim().length > 0;
};
