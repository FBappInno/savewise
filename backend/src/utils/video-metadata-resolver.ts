import type { PageMetadata } from "../types/page-metadata";

const OEMBED_TIMEOUT_MS = 10_000;
const MAX_TEXT_LENGTH = 12_000;

type VideoMetadata = Pick<
  PageMetadata,
  "title" | "description" | "author" | "thumbnailUrl" |
  "siteName" | "extractedText" | "mediaType" | "videoPlatform"
>;

type OEmbedResponse = {
  title?: unknown;
  author_name?: unknown;
  thumbnail_url?: unknown;
  provider_name?: unknown;
};

export async function resolveVideoMetadata(
  url: URL,
  fetchImplementation: typeof fetch = fetch,
): Promise<VideoMetadata | undefined> {
  const platform = detectVideoPlatform(url);
  if (!platform) return undefined;

  const endpoint = oEmbedEndpoint(platform, url);
  if (!endpoint) {
    return {
      title: `${platform} video`,
      siteName: platform,
      mediaType: "video",
      videoPlatform: platform,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OEMBED_TIMEOUT_MS);

  try {
    const response = await fetchImplementation(endpoint, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return undefined;

    const payload = await response.json() as OEmbedResponse;
    const title = cleanText(payload.title);
    const author = cleanText(payload.author_name);
    const provider = cleanText(payload.provider_name) ?? platform;
    const thumbnailUrl = cleanUrl(payload.thumbnail_url);
    const extractedText = [title, author ? `Creator: ${author}` : undefined]
      .filter((value): value is string => Boolean(value))
      .join("\n")
      .slice(0, MAX_TEXT_LENGTH);

    return {
      title: title ?? `${platform} video`,
      description: title,
      author,
      thumbnailUrl,
      siteName: provider,
      extractedText: extractedText || undefined,
      mediaType: "video",
      videoPlatform: platform,
    };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function detectVideoPlatform(url: URL): string | undefined {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com")) {
    return "TikTok";
  }
  if (
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com") ||
    hostname === "youtu.be"
  ) {
    return "YouTube";
  }
  if (hostname === "vimeo.com" || hostname.endsWith(".vimeo.com")) {
    return "Vimeo";
  }
  if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
    return "Instagram";
  }
  return undefined;
}

function oEmbedEndpoint(platform: string, url: URL): URL | undefined {
  const endpoint = platform === "TikTok"
    ? new URL("https://www.tiktok.com/oembed")
    : platform === "YouTube"
      ? new URL("https://www.youtube.com/oembed")
      : platform === "Vimeo"
        ? new URL("https://vimeo.com/api/oembed.json")
        : undefined;

  if (!endpoint) return undefined;
  endpoint.searchParams.set("url", url.toString());
  if (platform === "YouTube") endpoint.searchParams.set("format", "json");
  return endpoint;
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || undefined;
}

function cleanUrl(value: unknown): string | undefined {
  const normalized = cleanText(value);
  if (!normalized) return undefined;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
