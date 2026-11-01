import { icon } from "../components/icons";
import { html, qs } from "../lib/dom";
import { player } from "../player/player";
import { renderIfChanged, type PageInit } from "./page";

const FALLBACK_COVER = "images/logo-vector/quivers-logo-white.rz4e36.svg";

export const music: PageInit = ({ main, cleanup }) => {
  const section = qs("[data-tracks]", main);
  const list = qs("[data-track-list]", main);
  if (!section || !list) return;

  const onClick = (event: Event) => {
    const button = (event.target as Element).closest<HTMLElement>("[data-track-index]");
    if (button) player.playTrack(Number(button.dataset.trackIndex));
  };
  list.addEventListener("click", onClick);
  cleanup(() => list.removeEventListener("click", onClick));

  cleanup(
    player.subscribe((state) => {
      section.hidden = !state.enabled || state.tracks.length === 0;
      renderIfChanged(
        list,
        html`${state.tracks.map((track, i) => {
          const current = i === state.index && (state.playing || state.time > 0);
          const playing = current && state.playing;
          return html`<li>
            <button type="button" class="track-row ${current ? "is-current" : ""}" data-track-index="${i}"
              aria-label="${playing ? "Pause" : "Play"} ${track.name}">
              <span class="track-number">${String(i + 1).padStart(2, "0")}</span>
              <img class="track-cover" src="${track.cover || FALLBACK_COVER}" alt="" width="56" height="56" loading="lazy" />
              <span class="track-text">
                <span class="track-name">${track.name}</span>
                <span class="track-artist">${track.artist}</span>
              </span>
              ${playing ? html`<span class="player-mini-bars" aria-hidden="true"><i></i><i></i><i></i></span>` : ""}
              <span class="track-play-icon">${icon(playing ? "pause" : "play")}</span>
            </button>
          </li>`;
        })}`,
      );
    }),
  );
};
