// Sample-data stand-in for the Quivers API, used by the dev server
// (scripts/dev.ts) so the site can be worked on without the real API.
// Routes and shapes follow the generated client (src/api/quivers-api.ts).
// Nothing here is real: payments always succeed and orders aren't kept.

import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  About,
  BandMember,
  ContactDetail,
  CreateOrderDto,
  Merch,
  MerchVariation,
  MusicPoweredPaymentResponse,
  Playlist,
  SiteSettings,
} from "../src/api/quivers-api.ts";

export const MOCK_API_PREFIX = "/mock-api";
const MEDIA = `${MOCK_API_PREFIX}/media`;
const MEDIA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "media");
const USER_ID = "mock-quivers";

const about: About = {
  id: "about-1",
  user_id: USER_ID,
  content:
    "<p>Quivers have been making jangle-damaged lyric-driven guitar pop long enough now for REM to slide into their DMs. " +
    "Dream US label Merge signed the band for their 3rd release, <em>Oyster Cuts</em>, and Quivers toured with indie stalwarts " +
    "Superchunk and by themselves all over Australia, Europe and North America in 2024.</p>" +
    "<p>This next chapter features a louder trio sound with new collaborators Shauna Boyle (Cable Ties, drums/singing) and " +
    "Thomas Skalicky (Little Island, bass/singing).</p>",
  currency: "AUD",
  stripe_public_key: "pk_test_mock",
  merch_override_enabled: false,
  merch_override_url: "",
  highlight_colour: "#02bacd",
  band_photo_url: "",
  contact_bg_img: "",
  about_bg_img: "",
  contact_img: "",
  home_img: "",
  main_logo: "",
  music_club_img: "",
  tour_bg_img: "",
  videos_writeup: "",
  home_writeup: "",
  admin_avatar_img: "",
  merch_intro_img: "",
  ga_tag: "",
};

// Only the settings the site reads matter; the rest are filled in below.
const settings = new Proxy(
  {
    id: "settings-1",
    user_id: USER_ID,
    track_player_enabled: true,
    newsletter_enabled: true,
    admin_newsletter_enabled: true,
    contact_form_enabled: true,
    merch_enabled: true,
    no_merch_label: "No merch available right now. Check back soon!",
  } as Record<string, unknown>,
  { get: (target, key: string) => (key in target ? target[key] : key.endsWith("_enabled") ? false : "") },
) as unknown as SiteSettings;

const members: BandMember[] = [
  { id: "m1", user_id: USER_ID, name: "Sam Nicholson", sort_order: 0 },
  { id: "m2", user_id: USER_ID, name: "Shauna Boyle", sort_order: 1 },
  { id: "m3", user_id: USER_ID, name: "Thomas Skalicky", sort_order: 2 },
];

const playlist: Playlist[] = [
  ["Bottle The Nervous", "seven-inch.svg"],
  ["Drive Somewhere", "seven-inch.svg"],
  ["Sample Track Three", "oyster-cuts.jpg"],
  ["Sample Track Four", "oyster-cuts.jpg"],
].map(([name, cover], i) => ({
  id: `track-${i + 1}`,
  user_id: USER_ID,
  name,
  singer: "Quivers",
  cover: `${MEDIA}/${cover}`,
  music_src: `${MEDIA}/track-${i + 1}.wav`,
  created_on: "2026-10-01T00:00:00.000Z",
}));

const contactDetail: ContactDetail = { id: "contact-1", user_id: USER_ID, contact_html: "" };

const variation = (merchId: string, label: string, options: [string, number][]): MerchVariation => {
  const id = `${merchId}-${label}`.toLowerCase();
  return {
    id,
    label,
    option: "",
    stock_count: 0,
    user_id: USER_ID,
    merch_id: merchId,
    merch_variation_options: options.map(([option, stock], i) => ({
      id: `${id}-${i}`,
      option,
      user_id: USER_ID,
      merch_id: merchId,
      merch_variation_id: id,
      merch_variation_stock_count: {
        id: `${id}-${i}-stock`,
        stock_count: stock,
        user_id: USER_ID,
        merch_id: merchId,
        merch_variation_id: id,
        merch_variation_option_id: `${id}-${i}`,
      },
    })),
  };
};

const product = (
  fields: Pick<Merch, "id" | "title" | "price"> & Partial<Omit<Merch, "type">> & { kind?: "STANDARD" | "DIGITAL" },
  images: string[],
): Merch => ({
  num_sales: 0,
  breadcrumb: fields.title,
  description: "",
  handling_time_days: 5,
  to_be_released_on: "",
  quantity: 20,
  shipping_cst: 1500,
  sku: fields.id.toUpperCase(),
  user_id: USER_ID,
  is_published: true,
  merch_shipping_costs: [],
  merch_variations: [],
  ...fields,
  type: fields.kind ?? "STANDARD",
  merch_images: images.map((file, i) => ({
    id: `${fields.id}-img-${i}`,
    image_url: `${MEDIA}/${file}`,
    user_id: USER_ID,
    merch_id: fields.id,
  })),
});

// Australia, roughly: domestic postage is cheaper than the default.
const australia = [
  [-9.5, 112.5], [-9.5, 154.5], [-44.5, 154.5], [-44.5, 112.5],
].map(([latitude, longitude], i) => ({
  id: `au-${i}`, latitude, longitude, user_id: USER_ID, created_on: "", post_cost_region_id: "au",
}));

const merch: Merch[] = [
  product(
    {
      id: "oyster-cuts-lp",
      title: "Oyster Cuts – LP",
      breadcrumb: "Oyster Cuts LP",
      price: 4000,
      shipping_cst: 2500,
      description:
        "<p>The third Quivers album, out now on Merge Records. Pressed on 140g vinyl with a printed inner sleeve.</p>" +
        "<p><strong>Note:</strong> this is sample data from the development API.</p>",
      merch_variations: [variation("oyster-cuts-lp", "Colour", [["Black vinyl", 12], ["Teal vinyl", 0]])],
      merch_shipping_costs: [
        {
          id: "lp-au",
          cost_cents: 1200,
          user_id: USER_ID,
          merch_id: "oyster-cuts-lp",
          post_cost_region_id: "au",
          post_cost_region: { id: "au", name: "Australia", user_id: USER_ID, post_cost_region_paths: australia },
        },
      ],
    },
    ["oyster-cuts.jpg", "vinyl.svg"],
  ),
  product(
    {
      id: "bottle-the-nervous-7",
      title: "Bottle The Nervous 7\"",
      price: 1500,
      shipping_cst: 1200,
      to_be_released_on: "2026-11-04T00:00:00.000Z",
      description: "<p>New single backed with a cover of The Vulgar Boatmen's “Drive Somewhere”.</p>",
    },
    ["seven-inch.svg"],
  ),
  product(
    {
      id: "teal-logo-tee",
      title: "Teal Logo T-Shirt",
      price: 3500,
      shipping_cst: 1000,
      description: "<p>Soft cotton tee in teal with the Quivers logo.</p>",
      merch_variations: [variation("teal-logo-tee", "Size", [["S", 4], ["M", 6], ["L", 0], ["XL", 2]])],
    },
    ["t-shirt.svg"],
  ),
  product(
    { id: "oyster-cuts-tote", title: "Oyster Cuts Tote Bag", price: 2500, quantity: 0, shipping_cst: 900 },
    ["tote.svg"],
  ),
  {
    ...product(
      {
        id: "oyster-cuts-digital",
        title: "Oyster Cuts – Digital Album",
        price: 1200,
        kind: "DIGITAL",
        shipping_cst: 0,
        description: "<p>The full album as high-quality downloads.</p>",
      },
      [],
    ),
    sample_pack: {
      id: "pack-1",
      merch_id: "oyster-cuts-digital",
      pack_image: `${MEDIA}/oyster-cuts.jpg`,
      size_bytes: 412_000_000,
      deliverable_last_generated_on: "",
      deliverable_last_modified_on: "",
      tags: ["album"],
      files: [
        { id: "f1", file_object_id: "", file_name: "Oyster Cuts (FLAC).zip", size_bytes: 310_000_000, sample_pack_id: "pack-1" },
        { id: "f2", file_object_id: "", file_name: "Oyster Cuts (MP3 320).zip", size_bytes: 102_000_000, sample_pack_id: "pack-1" },
      ],
      previews: [
        { id: "p1", file_object_id: `${MEDIA}/track-3.wav`, type: "AUDIO", sample_pack_id: "pack-1", size_bytes: 0, file_name: "Sample Track Three (preview)" },
      ],
    },
  },
];

// A short synthesised jangle, so the music player has something to play.
const audioCache = new Map<number, Buffer>();
const synthesise = (seed: number, seconds = 24): Buffer => {
  const cached = audioCache.get(seed);
  if (cached) return cached;
  const rate = 22050;
  const samples = rate * seconds;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  const root = 196 * 2 ** ((seed * 5) / 12);
  const pattern = [0, 4, 7, 12, 7, 4, 9, 7];
  for (let i = 0; i < samples; i++) {
    const t = i / rate;
    const step = Math.floor(t / 0.22);
    const noteT = t - step * 0.22;
    const freq = root * 2 ** (pattern[step % pattern.length] / 12);
    const bassFreq = root / 2 * 2 ** ([0, 5, 7, 5][Math.floor(t / 1.76) % 4] / 12);
    const env = Math.exp(-noteT * 9);
    const value =
      0.32 * env * (Math.sin(2 * Math.PI * freq * t) + 0.4 * Math.sin(4 * Math.PI * freq * t)) +
      0.18 * Math.sin(2 * Math.PI * bassFreq * t);
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767 * 0.8), 44 + i * 2);
  }
  audioCache.set(seed, buffer);
  return buffer;
};

const readBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
};

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
};

const MEDIA_TYPES: Record<string, string> = { ".svg": "image/svg+xml", ".jpg": "image/jpeg" };

export const handleMockApi = async (
  req: IncomingMessage,
  res: ServerResponse,
  route: string,
  url: URL,
): Promise<void> => {
  const method = req.method ?? "GET";

  if (route.startsWith("/media/")) {
    const name = path.basename(route);
    const track = /^track-(\d+)\.wav$/.exec(name);
    if (track) {
      // Browsers need byte ranges to know the length and to seek.
      const audio = synthesise(Number(track[1]));
      const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
      if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Math.min(Number(range[2]), audio.length - 1) : audio.length - 1;
        res.writeHead(206, {
          "content-type": "audio/wav",
          "accept-ranges": "bytes",
          "content-range": `bytes ${start}-${end}/${audio.length}`,
          "content-length": end - start + 1,
        });
        return void res.end(audio.subarray(start, end + 1));
      }
      res.writeHead(200, { "content-type": "audio/wav", "accept-ranges": "bytes", "content-length": audio.length });
      return void res.end(audio);
    }
    const file = await readFile(path.join(MEDIA_DIR, name)).catch(() => null);
    if (!file) return json(res, 404, { message: "Not found" });
    res.writeHead(200, { "content-type": MEDIA_TYPES[path.extname(name)] ?? "application/octet-stream" });
    return void res.end(file);
  }

  // MOCK_API_DOWN=1 shows how the site behaves when the API is unreachable.
  if (process.env.MOCK_API_DOWN) return json(res, 503, { message: "Mock API is down" });
  await new Promise((resolve) => setTimeout(resolve, 150)); // a little realism

  const get = method === "GET";
  if (get && route === `/about/user/slug/${"quivers"}`) return json(res, 200, about);
  if (get && route === `/users`) return json(res, 200, { id: USER_ID, band_name: "Quivers", slug: url.searchParams.get("slug") });
  if (get && route === `/site-settings/${USER_ID}`) return json(res, 200, settings);
  if (get && route === `/merch/user/${USER_ID}`) return json(res, 200, merch);
  if (get && route === `/playlist/user/${USER_ID}`) return json(res, 200, playlist);
  if (get && route === `/band-member/user/${USER_ID}`) return json(res, 200, members);
  if (get && route === `/contact-details/user/${USER_ID}`) return json(res, 200, contactDetail);

  if (method === "POST") {
    const body = (await readBody(req)) as Record<string, unknown>;
    switch (route) {
      case "/payments": {
        const response: MusicPoweredPaymentResponse = {
          RequiresAction: false,
          ClientSecret: "",
          Success: true,
          StatusCode: 200,
          Message: "No extra step required",
          PaymentIntentId: `pi_mock_${Date.now()}`,
        };
        console.log(`[mock-api] payment of ${body.AmountCents} cents`);
        return json(res, 201, response);
      }
      case "/order": {
        const order = body as unknown as CreateOrderDto;
        const id = `order_mock_${Date.now()}`;
        console.log(`[mock-api] order ${id}: ${order.order_total_cents} cents, ${order.items.length} item(s)`);
        console.log(JSON.stringify(order, null, 2));
        return json(res, 201, { id });
      }
      case "/notifications/order":
        return json(res, 201, { Success: true, Message: "Sent", StatusCode: 200 });
      case "/order/verify":
        return json(res, 201, { Success: true, Message: "Verified", StatusCode: 200 });
      case "/mailing-list":
        console.log(`[mock-api] mailing list signup: ${body.email_address}`);
        return json(res, 201, { id: `ml_${Date.now()}`, ...body });
      case `/contact-details/user/${USER_ID}/send-contact-form`:
        console.log(`[mock-api] contact form from ${body.email_address}`);
        return json(res, 201, contactDetail);
    }
  }

  json(res, 404, { message: `No mock for ${method} ${route}` });
};
