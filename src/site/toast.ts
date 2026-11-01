import { html, render, type SafeHtml } from "../lib/dom";

type Tone = "info" | "success" | "error";

let region: HTMLElement | null = null;

const ensureRegion = (): HTMLElement => {
  if (!region) {
    region = document.createElement("div");
    region.className = "toast-region";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.append(region);
  }
  return region;
};

/** Shows a short message in the corner of the screen. */
export const toast = (
  message: string | SafeHtml,
  options: { tone?: Tone; title?: string; action?: { label: string; href: string } } = {},
): void => {
  const el = document.createElement("div");
  el.className = `toast toast-${options.tone ?? "info"}`;
  render(
    el,
    html`<div class="toast-body">
        ${options.title ? html`<strong class="toast-title">${options.title}</strong>` : ""}
        <span>${message}</span>
      </div>
      ${options.action ? html`<a class="toast-action" href="${options.action.href}">${options.action.label}</a>` : ""}
      <button type="button" class="toast-close" aria-label="Dismiss">&times;</button>`,
  );
  const dismiss = () => {
    el.classList.add("is-leaving");
    window.setTimeout(() => el.remove(), 300);
  };
  el.querySelector(".toast-close")?.addEventListener("click", dismiss);
  el.querySelector(".toast-action")?.addEventListener("click", dismiss);
  ensureRegion().append(el);
  requestAnimationFrame(() => el.classList.add("is-visible"));
  window.setTimeout(dismiss, 6000);
};
