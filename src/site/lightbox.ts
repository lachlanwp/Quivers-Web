import { qs } from "../lib/dom";

let images: string[] = [];
let index = 0;
let lastFocus: Element | null = null;

const parts = () => ({
  box: qs("#lightbox"),
  img: qs<HTMLImageElement>("#lightbox-img"),
  prev: qs<HTMLButtonElement>(".lightbox-prev"),
  next: qs<HTMLButtonElement>(".lightbox-next"),
  close: qs<HTMLButtonElement>(".lightbox-close"),
});

const isOpen = (): boolean => parts().box?.style.display === "block";

/** Loads an image fully before fading it in, so it never appears half-drawn. */
const showImage = (src: string) => {
  const { img } = parts();
  if (!img) return;
  img.style.opacity = "0";
  const preload = new Image();
  preload.onload = () => {
    img.src = src;
    window.setTimeout(() => (img.style.opacity = "1"), 50);
  };
  preload.onerror = () => (img.style.opacity = "1");
  preload.src = src;
};

const step = (delta: number) => {
  if (images.length < 2) return;
  index = (index + delta + images.length) % images.length;
  showImage(images[index]);
};

/**
 * Opens images full screen. "cover" fills the screen (band photos);
 * "contain" shows the whole image (product photos).
 */
export const openLightbox = (
  sources: string[],
  start = 0,
  options: { fit?: "cover" | "contain"; alt?: string } = {},
): void => {
  const { box, img, prev, next, close } = parts();
  if (!box || !img || sources.length === 0) return;
  images = sources;
  index = Math.min(Math.max(start, 0), sources.length - 1);
  lastFocus = document.activeElement;
  box.classList.toggle("is-contain", options.fit === "contain");
  img.alt = options.alt ?? "";
  if (prev) prev.hidden = sources.length < 2;
  if (next) next.hidden = sources.length < 2;
  box.style.display = "block";
  box.style.opacity = "0";
  img.style.opacity = "0";
  img.removeAttribute("src");
  document.body.style.overflow = "hidden";
  window.setTimeout(() => (box.style.opacity = "1"), 10);
  showImage(images[index]);
  close?.focus();
};

export const closeLightbox = (): void => {
  const { box, img } = parts();
  if (!box || !img || !isOpen()) return;
  img.style.opacity = "0";
  window.setTimeout(() => {
    box.style.opacity = "0";
    window.setTimeout(() => {
      box.style.display = "none";
      document.body.style.overflow = "";
      if (lastFocus instanceof HTMLElement) lastFocus.focus();
    }, 400);
  }, 100);
};

export const initLightbox = (): void => {
  const { box, prev, next, close } = parts();
  if (!box) return;

  // Band photos open full screen.
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLImageElement && target.classList.contains("band-photo")) {
      openLightbox([target.currentSrc || target.src], 0, { alt: target.alt });
    }
  });

  box.addEventListener("click", (event) => {
    if (event.target === box || event.target === close || event.target === qs(".lightbox-content")) {
      closeLightbox();
    }
  });
  prev?.addEventListener("click", () => step(-1));
  next?.addEventListener("click", () => step(1));

  document.addEventListener("keydown", (event) => {
    if (!isOpen()) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  });
};
