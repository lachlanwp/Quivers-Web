import { band } from "../data/band";
import { html, qs, qsa } from "../lib/dom";
import { hasText, sanitizeHtml } from "../lib/sanitize";
import { observeFadeIns } from "../site/effects";
import { renderIfChanged, type PageInit } from "./page";

/** "Sam Nicholson - guitar/vox" → name and role. */
const splitMember = (entry: string): { name: string; role: string } => {
  const [name, ...role] = entry.split(/\s+[-–—]\s+/);
  return { name: name.trim(), role: role.join(" - ").trim() };
};

export const about: PageInit = ({ main, cleanup }) => {
  const bio = qs("[data-about-content]", main);
  const members = qs("[data-members]", main);

  // Instruments from the page, for API names without a " - role" part.
  const roles = new Map<string, string>();
  for (const card of qsa(".member-card", members ?? main)) {
    const name = qs("h3", card)?.textContent?.trim().toLowerCase();
    const role = qs("p", card)?.textContent?.trim();
    if (name && role) roles.set(name, role);
  }

  cleanup(
    band.subscribe((state) => {
      // The bio and line-up from the MusicPowered admin replace the copy in
      // the HTML (which stays as the fallback).
      if (bio && hasText(state.about?.content)) {
        renderIfChanged(bio, sanitizeHtml(state.about?.content));
      }
      if (members && state.members.length) {
        const cards = html`${state.members.map((member) => {
          const { name, role: apiRole } = splitMember(member.name);
          const role = apiRole || roles.get(name.toLowerCase());
          return html`<div class="member-card">
            <h3>${name}</h3>
            ${role ? html`<p>${role}</p>` : ""}
          </div>`;
        })}`;
        if (renderIfChanged(members, cards)) observeFadeIns(members);
      }
    }),
  );
};
