export const qs = <T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T | null => root.querySelector<T>(selector);

export const qsa = <T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] => Array.from(root.querySelectorAll<T>(selector));

/** HTML that has already been escaped or sanitised. */
export class SafeHtml {
  readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
  toString(): string {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Marks a trusted string as HTML. Only use it for markup written here. */
export const raw = (markup: string): SafeHtml => new SafeHtml(markup);

const renderValue = (value: unknown): string => {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join("");
  if (value === null || value === undefined || value === false) return "";
  return escapeHtml(value);
};

/**
 * Tagged template for building markup. Interpolated values are escaped unless
 * they are SafeHtml (from html``, raw() or sanitizeHtml()). Arrays are joined,
 * and null, undefined and false render nothing.
 */
export const html = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): SafeHtml => {
  let out = strings[0];
  values.forEach((value, i) => {
    out += renderValue(value) + strings[i + 1];
  });
  return new SafeHtml(out);
};

export const render = (target: Element, content: SafeHtml): void => {
  target.innerHTML = content.value;
};

/** A link from the API, or "#" unless it's a web, email or same-site address. */
export const safeUrl = (url: string | null | undefined): string => {
  if (!url) return "#";
  try {
    const parsed = new URL(url, location.href);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? url : "#";
  } catch {
    return "#";
  }
};

export const show = (el: Element | null, visible = true): void => {
  if (el instanceof HTMLElement) el.hidden = !visible;
};
