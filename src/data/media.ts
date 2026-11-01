import type { Merch, Playlist } from "../api/client";
import { config } from "../config";

/** Points a media URL at a working host (see config.mediaHosts). */
export const mediaUrl = (url: string): string => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const host = config.mediaHosts[parsed.hostname];
    return host ? `${host}${parsed.pathname}${parsed.search}` : url;
  } catch {
    return url;
  }
};

export const withMediaUrls = {
  merch: (product: Merch): Merch => ({
    ...product,
    merch_images: (product.merch_images ?? []).map((image) => ({
      ...image,
      image_url: mediaUrl(image.image_url),
    })),
    sample_pack: product.sample_pack
      ? {
          ...product.sample_pack,
          pack_image: mediaUrl(product.sample_pack.pack_image),
          previews: (product.sample_pack.previews ?? []).map((preview) => ({
            ...preview,
            file_object_id: mediaUrl(preview.file_object_id),
          })),
        }
      : product.sample_pack,
  }),
  track: (track: Playlist): Playlist => ({
    ...track,
    cover: mediaUrl(track.cover),
    music_src: mediaUrl(track.music_src),
  }),
};
