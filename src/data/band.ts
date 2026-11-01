import { api, type About, type BandMember, type Merch, type Playlist, type SiteSettings } from "../api/client";
import { config } from "../config";
import { safeUrl } from "../lib/dom";
import { withMediaUrls } from "./media";
import { readJson, writeJson } from "../lib/storage";
import { createStore } from "../lib/store";

export interface BandState {
  /** "loading" until the first answer, "error" if the API couldn't be reached. */
  status: "loading" | "ready" | "error";
  /** True once data has been fetched from the API during this page session. */
  fresh: boolean;
  fetchedAt: number;
  userId: string;
  about: About | null;
  settings: SiteSettings | null;
  merch: Merch[];
  playlist: Playlist[];
  members: BandMember[];
}

const CACHE_KEY = "quivers.band.v1";

const empty: BandState = {
  status: "loading",
  fresh: false,
  fetchedAt: 0,
  userId: "",
  about: null,
  settings: null,
  merch: [],
  playlist: [],
  members: [],
};

// Show what we had last time straight away, then refresh from the API.
const cached = readJson<BandState>("session", CACHE_KEY);
const store = createStore<BandState>(
  cached ? { ...cached, status: "ready", fresh: false } : empty,
);

const settle = async <T>(request: Promise<{ data: T }>, fallback: T): Promise<T> => {
  try {
    return (await request).data;
  } catch {
    return fallback;
  }
};

const fetchAll = async (): Promise<void> => {
  try {
    const about = (await api.aboutControllerFindOneBySlug(config.bandSlug)).data;
    const userId = about.user_id;
    const [settings, merch, playlist, members] = await Promise.all([
      settle<SiteSettings | null>(api.siteSettingsControllerFindOne(userId), null),
      settle<Merch[]>(api.merchControllerFindForUser(userId), []),
      settle<Playlist[]>(api.playlistControllerFindForUser(userId), []),
      settle<BandMember[]>(api.bandMemberControllerFindForUser(userId), []),
    ]);
    const next: BandState = {
      status: "ready",
      fresh: true,
      fetchedAt: Date.now(),
      userId,
      about,
      settings,
      merch: (Array.isArray(merch) ? merch : []).map(withMediaUrls.merch),
      playlist: (Array.isArray(playlist) ? playlist : [])
        .filter((t) => t.music_src)
        .map(withMediaUrls.track),
      members: (Array.isArray(members) ? members : [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    };
    store.set(next);
    writeJson("session", CACHE_KEY, next);
  } catch {
    // Keep showing cached data if there is any; otherwise report the error.
    store.update({ status: store.get().about ? "ready" : "error", fresh: false });
  }
};

let inflight: Promise<void> | null = null;

export const band = {
  get: store.get,
  subscribe: store.subscribe,
  /** Fetches from the API unless data younger than maxAgeMs was already fetched this session. */
  refresh(maxAgeMs = 0): Promise<void> {
    const state = store.get();
    if (state.fresh && Date.now() - state.fetchedAt < maxAgeMs) return Promise.resolve();
    inflight ??= fetchAll().finally(() => {
      inflight = null;
    });
    return inflight;
  },
  /**
   * Resolves once there is band data to show (cached or fetched) or the API
   * has failed, or after timeoutMs at the latest.
   */
  whenReady(timeoutMs: number): Promise<void> {
    if (store.get().status !== "loading") return Promise.resolve();
    return new Promise((resolve) => {
      const timer = window.setTimeout(done, timeoutMs);
      const unsubscribe = store.subscribe((state) => {
        if (state.status !== "loading") done();
      });
      function done() {
        window.clearTimeout(timer);
        unsubscribe();
        resolve();
      }
    });
  },
};

export const currencyOf = (state: BandState): string => state.about?.currency || "AUD";

/** The merch page link, or the external store when the band has set one. */
export const merchOverrideUrl = (state: BandState): string | null => {
  const url = state.about?.merch_override_enabled ? safeUrl(state.about.merch_override_url) : "#";
  return url === "#" ? null : url;
};

/** Whether the band has the site-wide music player switched on. */
export const playerEnabled = (state: BandState): boolean =>
  state.playlist.length > 0 && (state.settings ? state.settings.track_player_enabled : true);
