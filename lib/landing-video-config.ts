export type LandingVideoSource =
  | { kind: "mp4"; url: string }
  | { kind: "embed"; url: string }
  | { kind: "none" };

function toYoutubeEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveLandingVideoSource(): LandingVideoSource {
  const raw = process.env.NEXT_PUBLIC_LANDING_VIDEO_URL?.trim();
  if (!raw) return { kind: "none" };

  if (raw.includes("youtube.com") || raw.includes("youtu.be")) {
    const embed = toYoutubeEmbedUrl(raw);
    return embed ? { kind: "embed", url: embed } : { kind: "none" };
  }

  if (raw.includes("vimeo.com")) {
    const match = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (match?.[1]) {
      return {
        kind: "embed",
        url: `https://player.vimeo.com/video/${match[1]}`,
      };
    }
    return { kind: "none" };
  }

  return { kind: "mp4", url: raw };
}

export const LANDING_VIDEO_POSTER = "/landing/dashboard.png?v=2";
