import { readJson, removeKey, writeJson } from "../lib/storage";
import { DEFAULT_COUNTRY, isCountryCode } from "./countries";

export interface CustomerDetails {
  first_name: string;
  last_name: string;
  email_address: string;
  phone_number: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postcode: string;
  /** ISO 3166-1 alpha-2 code, e.g. "AU". */
  country: string;
  message: string;
}

const KEY = "quivers.customer.v1";

export const emptyCustomer = (): CustomerDetails => ({
  first_name: "",
  last_name: "",
  email_address: "",
  phone_number: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  postcode: "",
  country: DEFAULT_COUNTRY,
  message: "",
});

/** Details from the last checkout in this browser, so a returning customer needn't retype them. */
export const loadCustomer = (): CustomerDetails => {
  const saved = readJson<Partial<CustomerDetails>>("local", KEY) ?? {};
  const details = { ...emptyCustomer() };
  for (const key of Object.keys(details) as (keyof CustomerDetails)[]) {
    if (typeof saved[key] === "string") details[key] = saved[key];
  }
  if (!isCountryCode(details.country)) details.country = DEFAULT_COUNTRY;
  return details;
};

export const saveCustomer = (details: CustomerDetails): void => writeJson("local", KEY, details);

export const clearCustomer = (): void => removeKey("local", KEY);
