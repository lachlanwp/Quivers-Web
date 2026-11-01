import { html, render, type SafeHtml } from "../lib/dom";

export interface DialogHandle {
  element: HTMLDialogElement;
  body: HTMLElement;
  close(): void;
}

/**
 * Opens a modal dialog (native <dialog>: focus is trapped and Escape closes
 * it). The dialog is removed from the page when closed.
 */
export const openDialog = (options: {
  title: string;
  body: SafeHtml;
  className?: string;
  onClose?: () => void;
}): DialogHandle => {
  const dialog = document.createElement("dialog");
  dialog.className = `dialog ${options.className ?? ""}`;
  const titleId = `dialog-title-${Date.now()}`;
  dialog.setAttribute("aria-labelledby", titleId);
  render(
    dialog,
    html`<div class="dialog-header">
        <h2 class="dialog-title" id="${titleId}">${options.title}</h2>
        <button type="button" class="dialog-close" aria-label="Close">&times;</button>
      </div>
      <div class="dialog-body">${options.body}</div>`,
  );
  document.body.append(dialog);
  const close = () => dialog.close();
  dialog.querySelector(".dialog-close")?.addEventListener("click", close);
  // Clicking the backdrop closes it.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("close", () => {
    options.onClose?.();
    dialog.remove();
  });
  dialog.showModal();
  return { element: dialog, body: dialog.querySelector<HTMLElement>(".dialog-body")!, close };
};

/** Closes any open dialogs, e.g. before navigating to another page. */
export const closeAllDialogs = (): void => {
  document.querySelectorAll<HTMLDialogElement>("dialog.dialog[open]").forEach((d) => d.close());
};
