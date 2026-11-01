import { band, merchOverrideUrl } from "../data/band";
import { cart, itemCount } from "../data/cart";
import { qs, qsa } from "../lib/dom";

const closeMenu = () => {
  qs(".hamburger")?.classList.remove("active");
  qs(".nav-menu")?.classList.remove("active");
  qs(".hamburger")?.setAttribute("aria-expanded", "false");
};

export const initNav = (): void => {
  const hamburger = qs<HTMLButtonElement>(".hamburger");
  const menu = qs(".nav-menu");

  hamburger?.addEventListener("click", () => {
    const open = !menu?.classList.contains("active");
    hamburger.classList.toggle("active", open);
    menu?.classList.toggle("active", open);
    hamburger.setAttribute("aria-expanded", String(open));
  });
  menu?.addEventListener("click", (event) => {
    if ((event.target as Element).closest(".nav-link")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  // Cart icon with item count, shown once something is in the cart.
  const cartLink = qs<HTMLAnchorElement>(".nav-cart");
  const cartCount = qs("[data-cart-count]");
  cart.subscribe(({ items }) => {
    const count = itemCount(items);
    if (cartLink) {
      cartLink.hidden = count === 0;
      cartLink.setAttribute("aria-label", `Cart, ${count} item${count === 1 ? "" : "s"}`);
    }
    if (cartCount) cartCount.textContent = String(count);
  });

  // When the band sells merch elsewhere, the Merch link goes there instead.
  band.subscribe((state) => {
    const override = merchOverrideUrl(state);
    for (const link of qsa<HTMLAnchorElement>("[data-merch-link]")) {
      link.dataset.localHref ??= link.getAttribute("href") ?? "merch.html";
      if (override) {
        link.href = override;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else {
        link.setAttribute("href", link.dataset.localHref);
        link.removeAttribute("target");
        link.removeAttribute("rel");
      }
    }
  });
};

/** After an in-page navigation, show the new page's nav state. */
export const syncNav = (next: Document): void => {
  closeMenu();
  const nextLinks = qsa<HTMLAnchorElement>(".nav-link", next);
  for (const link of qsa<HTMLAnchorElement>(".nav-link")) {
    const href = link.dataset.localHref ?? link.getAttribute("href");
    const match = nextLinks.find((l) => l.getAttribute("href") === href);
    link.classList.toggle("active", Boolean(match?.classList.contains("active")));
    if (match?.classList.contains("active")) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const logo = qs(".nav-logo");
  const nextLogo = qs(".nav-logo", next);
  if (logo && nextLogo) logo.className = nextLogo.className;
};
