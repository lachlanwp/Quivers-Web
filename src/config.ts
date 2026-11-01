export const config = {
  // Fixed at build time. Never read it from the URL: a link could otherwise
  // point checkout at another server (and another Stripe account).
  apiBaseUrl: __API_BASE_URL__,
  // Band name the API knows Quivers by.
  bandSlug: "quivers",
  // Browser key for Google's Geocoding API, used to work out regional
  // shipping costs from the customer's address.
  googleMapsApiKey: __GOOGLE_MAPS_API_KEY__,
  bandcampMerchUrl: "https://quiversss.bandcamp.com/merch",
  // Shown when a payment goes through but can't be recorded.
  contactEmail: "quiversmusic@gmail.com",
  // Photos and audio uploaded through MusicPowered are in the S3 bucket
  // "cdn2.musicpowered.net", but the musicpowered.net domain has lapsed, so
  // load them from the bucket's own S3 address. Remove the entry once the
  // files are served from a working domain again.
  mediaHosts: {
    "cdn2.musicpowered.net": "https://s3.ap-southeast-2.amazonaws.com/cdn.quiversmusic.com",
  } as Record<string, string>,
  requestTimeoutMs: 15000,
} as const;
