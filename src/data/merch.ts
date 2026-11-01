import type { Merch } from "../api/client";
import { formatDate, plural } from "../lib/format";

export type MerchKind = "STANDARD" | "DIGITAL";

/** Selected option per variation label, e.g. { Size: "M", Colour: "Teal" }. */
export type Variations = Record<string, string>;

// The API sends "STANDARD" or "DIGITAL"; anything else is treated as standard.
export const kindOf = (product: { type: string }): MerchKind =>
  product.type?.toUpperCase() === "DIGITAL" ? "DIGITAL" : "STANDARD";

export const isDigital = (product: { type: string }): boolean => kindOf(product) === "DIGITAL";

export const publishedMerch = (merch: Merch[]): Merch[] => merch.filter((m) => m.is_published);

export const findProduct = (merch: Merch[], id: string | null): Merch | undefined =>
  id ? merch.find((m) => m.id === id) : undefined;

export const productImages = (product: Merch): string[] => {
  const images = isDigital(product)
    ? [product.sample_pack?.pack_image]
    : (product.merch_images ?? []).map((image) => image.image_url);
  return images.filter((src): src is string => Boolean(src));
};

const stockOf = (option: { merch_variation_stock_count?: { stock_count?: number } | null }): number =>
  option.merch_variation_stock_count?.stock_count ?? 0;

/** True when every option of at least one variation is out of stock. */
export const variationsSoldOut = (product: Merch): boolean =>
  (product.merch_variations ?? []).some(
    (variation) =>
      (variation.merch_variation_options ?? []).length > 0 &&
      variation.merch_variation_options.reduce((sum, o) => sum + stockOf(o), 0) === 0,
  );

export const isSoldOut = (product: Merch): boolean =>
  !isDigital(product) && (product.quantity <= 0 || variationsSoldOut(product));

export const isPreorder = (product: Merch): boolean => Boolean(product.to_be_released_on);

/** Variations that have options to choose from. */
export const choosableVariations = (product: Merch) =>
  isDigital(product)
    ? []
    : (product.merch_variations ?? []).filter(
        (v) => v.label && (v.merch_variation_options ?? []).length > 0,
      );

/** The first in-stock option of each variation. */
export const defaultVariations = (product: Merch): Variations => {
  const chosen: Variations = {};
  for (const variation of choosableVariations(product)) {
    const options = variation.merch_variation_options;
    chosen[variation.label] = (options.find((o) => stockOf(o) > 0) ?? options[0]).option;
  }
  return chosen;
};

export const optionStock = (product: Merch, label: string, option: string): number | null => {
  const variation = (product.merch_variations ?? []).find((v) => v.label === label);
  const match = variation?.merch_variation_options?.find((o) => o.option === option);
  return match ? stockOf(match) : null;
};

/** How many of this product (with these options) can be bought. */
export const maxQuantity = (product: Merch, variations: Variations): number => {
  if (isDigital(product)) return 1;
  let max = Infinity;
  for (const [label, option] of Object.entries(variations)) {
    const stock = optionStock(product, label, option);
    if (stock !== null) max = Math.min(max, stock);
  }
  if (max === Infinity) max = product.quantity > 0 ? product.quantity : 0;
  return Math.max(0, Math.min(max, 99));
};

export const shippingNote = (product: Merch): string => {
  const days = product.handling_time_days;
  if (product.to_be_released_on) {
    return `Pre-order: ships within ${plural(days, "day")} after ${formatDate(product.to_be_released_on)}.`;
  }
  return `Ships in ${plural(days, "day")}.`;
};

export const stockNote = (product: Merch): string => {
  if (isDigital(product)) return "Instant digital download after purchase.";
  if (isSoldOut(product)) return "Sold out";
  const variations = choosableVariations(product);
  if (variations.length) return "";
  return product.quantity <= 5 ? `Only ${product.quantity} left` : "In stock";
};
