import type { Merch } from "../api/client";
import { config } from "../config";
import type { CartItem } from "./cart";
import { findProduct, isDigital } from "./merch";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Looks up an address with Google's Geocoding API. Null if it can't be found. */
export const geocode = async (address: string): Promise<LatLng | null> => {
  if (!config.googleMapsApiKey) return null;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", config.googleMapsApiKey);
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = (await response.json()) as {
      results?: { geometry?: { location?: { lat?: number; lng?: number } } }[];
    };
    const location = body.results?.[0]?.geometry?.location;
    return typeof location?.lat === "number" && typeof location.lng === "number"
      ? { lat: location.lat, lng: location.lng }
      : null;
  } catch {
    return null;
  }
};

// Ray casting point-in-polygon test, matching the API's order verification.
const isInside = (point: [number, number], polygon: [number, number][]): boolean => {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * Shipping for one product: the cost of the band's postage region containing
 * the address (the last one listed, if regions overlap, as the API does), or
 * the product's standard shipping cost when no region matches or the address
 * couldn't be located.
 */
export const productShippingCents = (product: Merch, location: LatLng | null): number => {
  if (isDigital(product)) return 0;
  const regions = product.merch_shipping_costs ?? [];
  if (location && regions.length) {
    const matches = regions.filter((region) => {
      const path = region.post_cost_region?.post_cost_region_paths ?? [];
      return (
        path.length > 2 &&
        isInside(
          [location.lat, location.lng],
          path.map((p) => [Number(p.latitude), Number(p.longitude)]),
        )
      );
    });
    if (matches.length) return matches[matches.length - 1].cost_cents ?? 0;
  }
  return product.shipping_cst ?? 0;
};

/**
 * An order pays shipping once: the highest shipping cost of anything in it.
 * The API checks orders the same way.
 */
export const cartShippingCents = (items: CartItem[], merch: Merch[], location: LatLng | null): number =>
  items.reduce((highest, item) => {
    const product = findProduct(merch, item.productId);
    return product ? Math.max(highest, productShippingCents(product, location)) : highest;
  }, 0);
