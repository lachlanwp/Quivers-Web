import { qsa } from "../lib/dom";

/** URL of the page's background image (body::before), read from the stylesheet. */
export const pageBackgroundUrl = (): string | null => {
  const background = getComputedStyle(document.body, "::before").backgroundImage;
  const match = /url\(["']?([^"')]+)["']?\)/.exec(background);
  return match ? match[1] : null;
};

/** Hero text drifts up and the page background scrolls at half speed. */
export const initParallax = (): void => {
  let ticking = false;
  const update = () => {
    ticking = false;
    const scrolled = window.scrollY;
    const heroContent = document.querySelector<HTMLElement>(".hero-content");
    if (heroContent) heroContent.style.transform = `translateY(${scrolled * -0.3}px)`;
    document.body.style.setProperty("--parallax-y", `${scrolled * 0.5}px`);
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();
};

const FADE_SELECTOR = ".quote-card, .member-card, .contact-section, .product-card, .stream-card";

const observer =
  "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
      )
    : null;

/** Cards fade up as they scroll into view. */
export const observeFadeIns = (root: ParentNode): void => {
  if (!observer || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (const el of qsa(FADE_SELECTOR, root)) {
    if (el.classList.contains("fade-in")) continue;
    el.classList.add("fade-in");
    observer.observe(el);
  }
};
