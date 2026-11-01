import { band, playerEnabled } from "../data/band";
import { track } from "../lib/analytics";
import { html, qs, render } from "../lib/dom";
import { formatTime } from "../lib/format";
import { readJson, writeJson } from "../lib/storage";
import { createStore } from "../lib/store";
import { toast } from "../site/toast";
import { icon } from "../components/icons";

export interface Track {
  id: string;
  name: string;
  artist: string;
  cover: string;
  src: string;
}

export interface PlayerState {
  enabled: boolean;
  tracks: Track[];
  index: number;
  playing: boolean;
  loading: boolean;
  time: number;
  duration: number;
  minimized: boolean;
}

interface Saved {
  trackId: string;
  time: number;
  playing: boolean;
  volume: number;
  minimized: boolean;
}

const SAVE_KEY = "quivers.player.v1";
const FALLBACK_COVER = "images/quivers-logo-white.vrahi4.png";

const saved = readJson<Saved>("session", SAVE_KEY);
const store = createStore<PlayerState>({
  enabled: false,
  tracks: [],
  index: 0,
  playing: false,
  loading: false,
  time: 0,
  duration: 0,
  minimized: saved?.minimized ?? false,
});

const audio = new Audio();
audio.preload = "metadata";
audio.volume = saved?.volume ?? 1;

let restored = false;
let root: HTMLElement | null = null;
let mini: HTMLButtonElement | null = null;

const current = (): Track | undefined => store.get().tracks[store.get().index];

const save = () => {
  const t = current();
  if (!t) return;
  writeJson("session", SAVE_KEY, {
    trackId: t.id,
    time: audio.currentTime || 0,
    playing: !audio.paused,
    volume: audio.volume,
    minimized: store.get().minimized,
  } satisfies Saved);
};

const load = (index: number, startAt = 0) => {
  const { tracks } = store.get();
  const t = tracks[index];
  if (!t) return;
  store.update({ index, time: startAt, duration: 0, loading: true });
  audio.src = t.src;
  if (startAt > 0) {
    audio.addEventListener("loadedmetadata", () => (audio.currentTime = startAt), { once: true });
  }
  updateMediaSession(t);
};

const play = async (): Promise<void> => {
  if (!current()) return;
  if (!audio.src) load(store.get().index);
  try {
    await audio.play();
  } catch {
    // Autoplay was blocked or the track failed; the controls show it paused.
    store.update({ playing: false, loading: false });
  }
};

export const player = {
  get: store.get,
  subscribe: store.subscribe,
  /** Plays a track from the playlist, or toggles it if it's already loaded. */
  playTrack(index: number): void {
    if (index === store.get().index && audio.src) {
      player.toggle();
      return;
    }
    load(index);
    void play();
    track("music_play", { track_name: store.get().tracks[index]?.name });
  },
  toggle(): void {
    if (audio.paused) {
      void play();
      track("music_play", { track_name: current()?.name });
    } else {
      audio.pause();
    }
  },
  next(): void {
    const { tracks, index } = store.get();
    if (tracks.length) player.playTrack((index + 1) % tracks.length);
  },
  previous(): void {
    const { tracks, index } = store.get();
    if (audio.currentTime > 3 || tracks.length < 2) {
      audio.currentTime = 0;
      return;
    }
    player.playTrack((index - 1 + tracks.length) % tracks.length);
  },
  seek(seconds: number): void {
    if (Number.isFinite(seconds)) audio.currentTime = seconds;
  },
  setMinimized(minimized: boolean): void {
    store.update({ minimized });
    save();
  },
};

const updateMediaSession = (t: Track) => {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.name,
    artist: t.artist,
    album: "Quivers",
    artwork: t.cover ? [{ src: new URL(t.cover, location.href).href }] : [],
  });
};

const setUpMediaSession = () => {
  if (!("mediaSession" in navigator)) return;
  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ["play", () => void play()],
    ["pause", () => audio.pause()],
    ["previoustrack", () => player.previous()],
    ["nexttrack", () => player.next()],
    ["seekto", (details) => player.seek(details.seekTime ?? 0)],
  ];
  for (const [action, handler] of handlers) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Not supported by this browser.
    }
  }
};

// Audio element events drive the state.
audio.addEventListener("play", () => store.update({ playing: true }));
audio.addEventListener("playing", () => store.update({ playing: true, loading: false }));
audio.addEventListener("pause", () => {
  store.update({ playing: false });
  save();
});
audio.addEventListener("waiting", () => store.update({ loading: true }));
audio.addEventListener("canplay", () => store.update({ loading: false }));
const updateDuration = () =>
  store.update({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 });
audio.addEventListener("loadedmetadata", updateDuration);
audio.addEventListener("durationchange", updateDuration);
let lastSave = 0;
audio.addEventListener("timeupdate", () => {
  store.update({ time: audio.currentTime });
  if (Date.now() - lastSave > 1000) {
    lastSave = Date.now();
    save();
  }
});
audio.addEventListener("ended", () => {
  track("music_end", { track_name: current()?.name });
  player.next();
});
audio.addEventListener("error", () => {
  if (!audio.src) return;
  store.update({ playing: false, loading: false });
  toast(`Sorry, "${current()?.name ?? "this track"}" couldn't be played.`, { tone: "error" });
});
window.addEventListener("pagehide", save);

const renderPlayer = () => {
  root = document.createElement("section");
  root.className = "player";
  root.hidden = true;
  root.setAttribute("aria-label", "Music player");
  render(
    root,
    html`<div class="player-progress-line" aria-hidden="true"><span></span></div>
      <div class="player-playlist" id="player-playlist" hidden>
        <div class="player-playlist-header">
          <span>Playlist</span>
          <button type="button" class="player-icon-btn" data-action="close-list" aria-label="Close playlist">${icon("close")}</button>
        </div>
        <ol class="player-playlist-items"></ol>
      </div>
      <div class="player-inner">
        <img class="player-cover" alt="" width="52" height="52" />
        <div class="player-meta">
          <div class="player-title"></div>
          <div class="player-artist"></div>
        </div>
        <div class="player-controls">
          <button type="button" class="player-icon-btn" data-action="previous" aria-label="Previous track">${icon("previous")}</button>
          <button type="button" class="player-play" data-action="toggle" aria-label="Play">${icon("play")}</button>
          <button type="button" class="player-icon-btn" data-action="next" aria-label="Next track">${icon("next")}</button>
        </div>
        <div class="player-timeline">
          <span class="player-time" data-time>0:00</span>
          <input type="range" class="player-range player-seek" min="0" max="1000" value="0" step="1" aria-label="Seek" />
          <span class="player-time" data-duration>0:00</span>
        </div>
        <div class="player-extra">
          <label class="player-volume">
            <span class="visually-hidden">Volume</span>
            ${icon("volume")}
            <input type="range" class="player-range" min="0" max="100" value="100" data-volume />
          </label>
          <button type="button" class="player-icon-btn" data-action="list" aria-label="Show playlist" aria-controls="player-playlist" aria-expanded="false">${icon("list")}</button>
          <button type="button" class="player-icon-btn" data-action="minimize" aria-label="Minimise player">${icon("chevronDown")}</button>
        </div>
      </div>`,
  );
  document.body.append(root);

  mini = document.createElement("button");
  mini.type = "button";
  mini.className = "player-mini";
  mini.hidden = true;
  mini.setAttribute("aria-label", "Show music player");
  render(mini, html`<img alt="" /><span class="player-mini-bars" aria-hidden="true"><i></i><i></i><i></i></span>`);
  document.body.append(mini);
  mini.addEventListener("click", () => player.setMinimized(false));

  const seek = qs<HTMLInputElement>(".player-seek", root)!;
  seek.addEventListener("input", () => {
    const { duration } = store.get();
    if (duration) player.seek((Number(seek.value) / 1000) * duration);
  });
  const volume = qs<HTMLInputElement>("[data-volume]", root)!;
  volume.value = String(Math.round(audio.volume * 100));
  volume.style.setProperty("--fill", `${volume.value}%`);
  volume.addEventListener("input", () => {
    audio.volume = Number(volume.value) / 100;
    volume.style.setProperty("--fill", `${volume.value}%`);
    save();
  });

  root.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>("[data-action], [data-track]");
    if (!button) return;
    const list = qs("#player-playlist", root!)!;
    const listButton = qs('[data-action="list"]', root!)!;
    const toggleList = (open: boolean) => {
      list.hidden = !open;
      listButton.setAttribute("aria-expanded", String(open));
    };
    if (button.dataset.track) {
      player.playTrack(Number(button.dataset.track));
      return;
    }
    switch (button.dataset.action) {
      case "toggle":
        return player.toggle();
      case "next":
        return player.next();
      case "previous":
        return player.previous();
      case "list":
        return toggleList(list.hidden !== false);
      case "close-list":
        return toggleList(false);
      case "minimize":
        toggleList(false);
        return player.setMinimized(true);
    }
  });
};

let renderedTracks = "";

const update = (state: PlayerState) => {
  if (!root || !mini) return;
  const t = state.tracks[state.index];
  const visible = state.enabled && Boolean(t);
  root.hidden = !visible || state.minimized;
  mini.hidden = !visible || !state.minimized;
  document.body.classList.toggle("has-player", visible && !state.minimized);
  if (!t) return;

  const cover = t.cover || FALLBACK_COVER;
  const coverImg = qs<HTMLImageElement>(".player-cover", root)!;
  if (coverImg.getAttribute("src") !== cover) coverImg.src = cover;
  const miniImg = qs<HTMLImageElement>("img", mini)!;
  if (miniImg.getAttribute("src") !== cover) miniImg.src = cover;
  qs(".player-title", root)!.textContent = t.name;
  qs(".player-artist", root)!.textContent = t.artist;

  const playButton = qs('[data-action="toggle"]', root)!;
  const playIcon = state.playing ? "pause" : "play";
  if (playButton.dataset.icon !== playIcon) {
    playButton.dataset.icon = playIcon;
    render(playButton, icon(playIcon));
    playButton.setAttribute("aria-label", state.playing ? "Pause" : "Play");
  }
  root.classList.toggle("is-loading", state.loading && state.playing);
  mini.classList.toggle("is-playing", state.playing);

  const progress = state.duration ? (state.time / state.duration) * 100 : 0;
  const seek = qs<HTMLInputElement>(".player-seek", root)!;
  if (document.activeElement !== seek) seek.value = String(Math.round(progress * 10));
  seek.style.setProperty("--fill", `${progress}%`);
  qs<HTMLElement>(".player-progress-line span", root)!.style.width = `${progress}%`;
  qs("[data-time]", root)!.textContent = formatTime(state.time);
  qs("[data-duration]", root)!.textContent = formatTime(state.duration);

  const tracksMarkup = html`${state.tracks.map(
    (item, i) =>
      html`<li>
        <button type="button" class="player-playlist-item ${i === state.index ? "is-current" : ""}" data-track="${i}">
          <img src="${item.cover || FALLBACK_COVER}" alt="" width="40" height="40" loading="lazy" />
          <span class="player-playlist-text"><span class="player-playlist-name">${item.name}</span><span class="player-playlist-artist">${item.artist}</span></span>
          ${i === state.index && state.playing ? html`<span class="player-mini-bars" aria-hidden="true"><i></i><i></i><i></i></span>` : ""}
        </button>
      </li>`,
  )}`.value;
  if (tracksMarkup !== renderedTracks) {
    renderedTracks = tracksMarkup;
    qs(".player-playlist-items", root)!.innerHTML = tracksMarkup;
  }
};

export const initPlayer = (): void => {
  renderPlayer();
  setUpMediaSession();
  store.subscribe(update);

  band.subscribe((state) => {
    const enabled = playerEnabled(state);
    const tracks: Track[] = state.playlist.map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.singer || "Quivers",
      cover: t.cover,
      src: t.music_src,
    }));
    const playingId = current()?.id;
    const keepIndex = tracks.findIndex((t) => t.id === playingId);
    store.update({ enabled, tracks, index: keepIndex >= 0 ? keepIndex : 0 });
    if (!enabled) audio.pause();

    // Pick up where the last page left off.
    if (enabled && tracks.length && !restored) {
      restored = true;
      const savedIndex = saved ? tracks.findIndex((t) => t.id === saved.trackId) : -1;
      if (savedIndex >= 0) {
        load(savedIndex, saved!.time);
        store.update({ loading: false });
        if (saved!.playing) void play();
      }
    }
  });
};
