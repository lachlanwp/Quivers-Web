import type { Merch } from "../api/client";
import { readJson, writeJson } from "../lib/storage";
import { createStore } from "../lib/store";
import { findProduct, isDigital, kindOf, maxQuantity, type MerchKind, type Variations } from "./merch";

export interface CartItem {
  itemId: string;
  productId: string;
  quantity: number;
  /** Amount paid above the listed price ("name your price"). */
  extraCents: number;
  variations: Variations;
  type: MerchKind;
}

export interface CartState {
  items: CartItem[];
}

const KEY = "quivers.cart.v1";

const isCartItem = (value: unknown): value is CartItem => {
  const item = value as CartItem;
  return (
    typeof item?.itemId === "string" &&
    typeof item.productId === "string" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.extraCents === "number"
  );
};

const load = (): CartItem[] => {
  const saved = readJson<unknown[]>("local", KEY);
  return Array.isArray(saved) ? saved.filter(isCartItem) : [];
};

const store = createStore<CartState>({ items: load() });

const save = (items: CartItem[]): void => {
  writeJson("local", KEY, items);
  store.set({ items });
};

// Keep tabs in sync.
window.addEventListener("storage", (event) => {
  if (event.key === KEY) store.set({ items: load() });
});

const newId = (): string =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const sameOptions = (a: Variations, b: Variations): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
};

export interface AddResult {
  added: number;
  item: CartItem | null;
}

export const cart = {
  get: store.get,
  subscribe: store.subscribe,

  /** Adds a product, merging with a matching line. Never exceeds the stock available. */
  add(product: Merch, options: { variations: Variations; quantity: number; unitCents: number }): AddResult {
    const items = store.get().items.map((item) => ({ ...item }));
    const extraCents = Math.max(0, Math.round(options.unitCents) - product.price);
    const max = maxQuantity(product, options.variations);
    const existing = items.find(
      (item) =>
        item.productId === product.id &&
        item.extraCents === extraCents &&
        sameOptions(item.variations, options.variations),
    );
    // Digital downloads are one per order.
    if (existing && isDigital(product)) return { added: 0, item: existing };
    const current = existing?.quantity ?? 0;
    const added = Math.max(0, Math.min(options.quantity, max - current));
    if (added === 0) return { added: 0, item: existing ?? null };

    let item: CartItem;
    if (existing) {
      existing.quantity += added;
      item = existing;
    } else {
      item = {
        itemId: newId(),
        productId: product.id,
        quantity: added,
        extraCents,
        variations: { ...options.variations },
        type: kindOf(product),
      };
      items.push(item);
    }
    save(items);
    return { added, item };
  },

  setQuantity(itemId: string, quantity: number, product?: Merch): void {
    const items = store.get().items
      .map((item) => {
        if (item.itemId !== itemId) return item;
        const max = product ? maxQuantity(product, item.variations) : quantity;
        return { ...item, quantity: Math.min(Math.max(0, Math.round(quantity)), max) };
      })
      .filter((item) => item.quantity > 0);
    save(items);
  },

  remove(itemId: string): void {
    save(store.get().items.filter((item) => item.itemId !== itemId));
  },

  clear(): void {
    save([]);
  },

  /** Drops items whose product no longer exists or is no longer for sale. */
  prune(merch: Merch[]): void {
    const items = store.get().items;
    const kept = items.filter((item) => findProduct(merch, item.productId)?.is_published);
    if (kept.length !== items.length) save(kept);
  },
};

export const itemCount = (items: CartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity, 0);

export const unitCents = (item: CartItem, product: Merch): number => product.price + item.extraCents;

export const subtotalCents = (items: CartItem[], merch: Merch[]): number =>
  items.reduce((sum, item) => {
    const product = findProduct(merch, item.productId);
    return product ? sum + unitCents(item, product) * item.quantity : sum;
  }, 0);

export const requiresShipping = (items: CartItem[]): boolean =>
  items.some((item) => item.type !== "DIGITAL");

/** "Size: M · Colour: Teal" */
export const variationsLabel = (variations: Variations): string =>
  Object.entries(variations)
    .filter(([label, option]) => label && option)
    .map(([label, option]) => `${label}: ${option}`)
    .join(" · ");
