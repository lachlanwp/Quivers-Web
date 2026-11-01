import { qsa } from "../lib/dom";

// Hand-drawn Australian plants behind each page (styles: body.<plant>::before).
const PLANTS = ["wattle", "eucalyptus", "kangaroo-paw", "bottlebrush"];
const PLANT_KEY = "backgroundPlant";

/** Picks a background plant at random, avoiding the one shown last. */
export const choosePlant = (): void => {
  let last: string | null = null;
  try {
    last = sessionStorage.getItem(PLANT_KEY);
  } catch {
    last = null;
  }
  const current = PLANTS.find((p) => document.body.classList.contains(p));
  const choices = PLANTS.filter((p) => p !== last && p !== current);
  const plant = choices[Math.floor(Math.random() * choices.length)] ?? PLANTS[0];
  document.body.classList.remove(...PLANTS);
  document.body.classList.add(plant);
  try {
    sessionStorage.setItem(PLANT_KEY, plant);
  } catch {
    // Not remembered; the next page may repeat it.
  }
};

/** URL of the current background plant image, read from the stylesheet. */
export const plantImageUrl = (): string | null => {
  const background = getComputedStyle(document.body, "::before").backgroundImage;
  const match = /url\(["']?([^"')]+)["']?\)/.exec(background);
  return match ? match[1] : null;
};

/** Hero text drifts up and the background plant scrolls at half speed. */
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
