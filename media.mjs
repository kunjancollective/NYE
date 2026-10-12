// Files live in an untracked private-media volume, never in the public repository.
export const collection = [
  {
    file: "immersive-panorama.webp",
    title: "Take the long way around.",
    subtitle: "Los Cabos / Panoramic exploration",
    alt: "Panoramic aerial view across the desert, golf course and coastline on both sides",
    role: "panorama",
    type: "image",
  },
  {
    file: "coastline.webp",
    title: "Where the desert meets the sea.",
    subtitle: "Los Cabos / From above",
    alt: "Panorama of a sandy Los Cabos coastline between deep blue bays",
    role: "hero",
    type: "image",
  },
  {
    file: "resort-panorama.webp",
    title: "A different point of view.",
    subtitle: "The resort / Aerial panorama",
    alt: "Wide aerial panorama of the resort, palms, pools and beachfront",
    type: "image",
  },
  {
    file: "beach-session.mp4",
    poster: "beach-session.webp",
    title: "Life between the sets.",
    subtitle: "A passing moment / 20-second film",
    alt: "Horses passing along the beach beside the ocean",
    type: "video",
  },
  {
    file: "booth-detail.webp",
    title: "Our kind of office.",
    subtitle: "Beachside / The little details",
    alt: "A white Kunjan Collective cap beside sound equipment with the beach beyond",
    type: "image",
  },
  {
    file: "horizon.webp",
    title: "Room to breathe.",
    subtitle: "Sea, sky & a little perspective",
    alt: "Open blue water beneath a vast sky, with the desert coastline in the distance",
    type: "image",
  },
  {
    file: "resort-detail.webp",
    title: "See you by the sea.",
    subtitle: "A closer look / The resort",
    alt: "Closer aerial view of the resort pools and palms behind the beach",
    type: "image",
  },
];
export const allowedMedia = new Set(
  collection.flatMap((x) => [x.file, ...(x.poster ? [x.poster] : [])]),
);
