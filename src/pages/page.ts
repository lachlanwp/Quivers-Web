import type { SafeHtml } from "../lib/dom";

export interface PageContext {
  main: HTMLElement;
  /** Registers something to undo when the visitor leaves the page. */
  cleanup(fn: () => void): void;
}

export type PageInit = (context: PageContext) => void;

const lastRendered = new WeakMap<Element, string>();

/**
 * Replaces an element's content unless it would be identical, so refreshed
 * data that hasn't changed doesn't reset what the visitor is doing.
 * Returns true if it rendered.
 */
export const renderIfChanged = (el: Element, content: SafeHtml): boolean => {
  if (lastRendered.get(el) === content.value) return false;
  lastRendered.set(el, content.value);
  el.innerHTML = content.value;
  return true;
};
