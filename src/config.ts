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
  // Show the bio and band members from the MusicPowered admin instead of the
  // copy in about.html. Off because the admin still has the 2024 bio and the
  // previous line-up; update them there first, then set this to true.
  aboutFromApi: false,
  // Photos and audio uploaded through MusicPowered are in the S3 bucket
  // "cdn2.musicpowered.net", but the musicpowered.net domain has lapsed, so
  // load them from the bucket's own S3 address. Remove the entry once the
  // files are served from a working domain again.
  mediaHosts: {
    "cdn2.musicpowered.net": "https://s3.ap-southeast-2.amazonaws.com/cdn2.musicpowered.net",
  } as Record<string, string>,
  requestTimeoutMs: 15000,
} as const;
