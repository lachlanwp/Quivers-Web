import { qs } from "../lib/dom";
import { plantImageUrl } from "./effects";

/**
 * Keeps the loading screen up until the page's images (and background plant)
 * have loaded, so the page appears all at once. A progress bar appears if it
 * takes more than a second, and the screen lifts after a few seconds regardless.
 */
export const initLoader = (): void => {
  const screen = qs(".loading-screen");
  if (!screen) return;
  const progress = qs(".loading-progress");
  const bar = qs(".loading-progress-bar");

  const urls = new Set<string>();
  for (const img of Array.from(document.images)) {
    if (img.loading !== "lazy" && img.src) urls.add(img.src);
  }
  const plant = plantImageUrl();
  if (plant) urls.add(plant);

  let loaded = 0;
  let done = false;
  let showProgress = false;

  const finish = () => {
    if (done) return;
    done = true;
    window.setTimeout(() => {
      document.body.classList.add("loaded");
      screen.classList.add("hidden");
      window.setTimeout(() => (screen.style.display = "none"), 500);
    }, 300);
  };

  const progressTimer = window.setTimeout(() => {
    showProgress = true;
    if (progress) progress.style.opacity = "1";
  }, 1000);
  window.setTimeout(finish, 4000);

  const onImage = () => {
    loaded += 1;
    if (bar && showProgress) bar.style.width = `${(loaded / urls.size) * 100}%`;
    if (loaded >= urls.size) {
      window.clearTimeout(progressTimer);
      finish();
    }
  };

  if (urls.size === 0) return finish();
  for (const src of urls) {
    const img = new Image();
    img.onload = onImage;
    img.onerror = onImage;
    img.src = src;
  }
};
