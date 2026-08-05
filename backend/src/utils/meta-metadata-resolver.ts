import * as cheerio from "cheerio";

import type {
  PageMetadata,
} from "../types/page-metadata";

const META_TIMEOUT_MS = 12_000;
const MAX_TEXT_LENGTH = 12_000;

type MetaPlatform =
  | "Facebook"
  | "Instagram";

type MetaOEmbedResponse = {
  title?: unknown;
  author_name?: unknown;
  provider_name?: unknown;
  thumbnail_url?: unknown;
  html?: unknown;
};

export async function resolveMetaMetadata(
  url: URL,
  fetchImplementation: typeof fetch = fetch,
): Promise<PageMetadata | undefined> {
  const platform =
    detectMetaPlatform(url);

  if (!platform) {
    return undefined;
  }

  const resolvedUrl =
    await resolvePublicRedirect(
      url,
      fetchImplementation,
    );

  const oEmbedMetadata =
    await resolveOEmbedMetadata(
      platform,
      resolvedUrl,
      fetchImplementation,
    );

  if (oEmbedMetadata) {
    return oEmbedMetadata;
  }

  return createProtectedMetaFallback(
    platform,
    resolvedUrl,
  );
}

function detectMetaPlatform(
  url: URL,
): MetaPlatform | undefined {
  const hostname =
    normalizeHostname(
      url.hostname,
    );

  if (
    hostname === "instagram.com" ||
    hostname.endsWith(
      ".instagram.com",
    ) ||
    hostname === "ig.me"
  ) {
    return "Instagram";
  }

  if (
    hostname === "facebook.com" ||
    hostname.endsWith(
      ".facebook.com",
    ) ||
    hostname === "fb.com" ||
    hostname.endsWith(
      ".fb.com",
    ) ||
    hostname === "fb.watch"
  ) {
    return "Facebook";
  }

  return undefined;
}

async function resolvePublicRedirect(
  initialUrl: URL,
  fetchImplementation: typeof fetch,
): Promise<URL> {
  if (
    normalizeHostname(
      initialUrl.hostname,
    ) !== "fb.watch"
  ) {
    return initialUrl;
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      META_TIMEOUT_MS,
    );

  try {
    const response =
      await fetchImplementation(
        initialUrl,
        {
          method: "HEAD",
          redirect: "follow",
          signal:
            controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
              "AppleWebKit/537.36 (KHTML, like Gecko) " +
              "Chrome/138.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml",
          },
        },
      );

    return response.url
      ? new URL(response.url)
      : initialUrl;
  } catch {
    return initialUrl;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveOEmbedMetadata(
  platform: MetaPlatform,
  url: URL,
  fetchImplementation: typeof fetch,
): Promise<PageMetadata | undefined> {
  const endpoints =
    createOEmbedEndpoints(
      platform,
      url,
    );

  for (const endpoint of endpoints) {
    const metadata =
      await requestOEmbed(
        platform,
        url,
        endpoint,
        fetchImplementation,
      );

    if (metadata) {
      return metadata;
    }
  }

  return undefined;
}

function createOEmbedEndpoints(
  platform: MetaPlatform,
  url: URL,
): URL[] {
  if (platform === "Instagram") {
    const endpoint =
      new URL(
        "https://graph.facebook.com/v25.0/instagram_oembed",
      );

    endpoint.searchParams.set(
      "url",
      url.toString(),
    );

    endpoint.searchParams.set(
      "omitscript",
      "true",
    );

    return [endpoint];
  }

  const path =
    url.pathname.toLowerCase();

  const looksLikeVideo =
    path.includes("/reel/") ||
    path.includes("/reels/") ||
    path.includes("/videos/") ||
    path.includes("/watch");

  const endpointNames =
    looksLikeVideo
      ? [
          "oembed_video",
          "oembed_post",
        ]
      : [
          "oembed_post",
          "oembed_video",
        ];

  return endpointNames.map(
    (endpointName) => {
      const endpoint =
        new URL(
          `https://graph.facebook.com/v25.0/${endpointName}`,
        );

      endpoint.searchParams.set(
        "url",
        url.toString(),
      );

      endpoint.searchParams.set(
        "omitscript",
        "true",
      );

      return endpoint;
    },
  );
}

async function requestOEmbed(
  platform: MetaPlatform,
  originalUrl: URL,
  endpoint: URL,
  fetchImplementation: typeof fetch,
): Promise<PageMetadata | undefined> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      META_TIMEOUT_MS,
    );

  try {
    const response =
      await fetchImplementation(
        endpoint,
        {
          signal:
            controller.signal,
          headers: {
            Accept:
              "application/json",
            "User-Agent":
              "SaveWiseBot/0.3 (+https://savewise.app)",
          },
        },
      );

    if (!response.ok) {
      return undefined;
    }

    const payload =
      await response.json() as
        MetaOEmbedResponse;

    const author =
      cleanText(
        payload.author_name,
      );

    const suppliedTitle =
      cleanText(
        payload.title,
      );

    const provider =
      cleanText(
        payload.provider_name,
      ) ?? platform;

    const thumbnailUrl =
      cleanUrl(
        payload.thumbnail_url,
      );

    const embeddedText =
      extractTextFromHtml(
        payload.html,
      );

    const contentText =
      firstMeaningfulValue(
        suppliedTitle,
        embeddedText,
      );

    if (
      !contentText &&
      !author &&
      !thumbnailUrl
    ) {
      return undefined;
    }

    const title =
      createTitle(
        platform,
        suppliedTitle,
        author,
      );

    const description =
      contentText
        ? limitText(
            contentText,
            1_200,
          )
        : `${platform}-Beitrag von ${
            author ?? "unbekanntem Konto"
          }.`;

    const extractedText =
      [
        title,
        author
          ? `Autor: ${author}`
          : undefined,
        contentText,
        `Originalquelle: ${
          originalUrl.toString()
        }`,
      ]
        .filter(
          (
            value,
          ): value is string =>
            Boolean(value),
        )
        .join("\n")
        .slice(
          0,
          MAX_TEXT_LENGTH,
        );

    return {
      url:
        originalUrl.toString(),
      title,
      description,
      author,
      thumbnailUrl,
      siteName: provider,
      extractedText,
      mediaType:
        isVideoLikeUrl(
          originalUrl,
        )
          ? "video"
          : undefined,
      videoPlatform:
        isVideoLikeUrl(
          originalUrl,
        )
          ? platform
          : undefined,
      contentType: "html",
      fetchStrategy:
        "browser-compatible",
    };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function createProtectedMetaFallback(
  platform: MetaPlatform,
  url: URL,
): PageMetadata {
  const contentType =
    detectContentLabel(
      platform,
      url,
    );

  const title =
    `${platform} ${contentType}`;

  const description =
    `Der ${contentType.toLowerCase()} ist für SaveWise nicht vollständig ` +
    `öffentlich lesbar. Der Original-Link wurde gespeichert.`;

  return {
    url: url.toString(),
    title,
    description,
    siteName: platform,
    extractedText:
      `${title}. ${description} Originalquelle: ${url.toString()}`,
    mediaType:
      isVideoLikeUrl(url)
        ? "video"
        : undefined,
    videoPlatform:
      isVideoLikeUrl(url)
        ? platform
        : undefined,
    contentType: "html",
    fetchStrategy:
      "url-derived",
  };
}

function detectContentLabel(
  platform: MetaPlatform,
  url: URL,
): string {
  const path =
    url.pathname.toLowerCase();

  if (
    path.includes("/reel/") ||
    path.includes("/reels/")
  ) {
    return "Reel";
  }

  if (
    path.includes("/videos/") ||
    path.includes("/watch")
  ) {
    return "Video";
  }

  if (
    platform === "Instagram" &&
    path.includes("/p/")
  ) {
    return "Beitrag";
  }

  return "Beitrag";
}

function isVideoLikeUrl(
  url: URL,
): boolean {
  const path =
    url.pathname.toLowerCase();

  return (
    path.includes("/reel/") ||
    path.includes("/reels/") ||
    path.includes("/videos/") ||
    path.includes("/watch")
  );
}

function createTitle(
  platform: MetaPlatform,
  suppliedTitle:
    | string
    | undefined,
  author:
    | string
    | undefined,
): string {
  if (
    suppliedTitle &&
    !isGenericMetaText(
      suppliedTitle,
    )
  ) {
    return limitText(
      suppliedTitle,
      180,
    );
  }

  return author
    ? `${platform}-Beitrag von ${author}`
    : `${platform}-Beitrag`;
}

function extractTextFromHtml(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const $ =
    cheerio.load(value);

  $("script, style").remove();

  const text =
    normalizeText(
      $.root().text(),
    );

  if (
    !text ||
    isGenericMetaText(text)
  ) {
    return undefined;
  }

  return limitText(
    text,
    4_000,
  );
}

function isGenericMetaText(
  value: string,
): boolean {
  const normalized =
    normalizeText(value)
      .toLocaleLowerCase();

  const genericValues = [
    "facebook",
    "instagram",
    "log into facebook",
    "log in to facebook",
    "login to facebook",
    "anmelden oder registrieren",
    "melde dich bei facebook an",
    "log in • instagram",
    "instagram photos and videos",
    "facebook – log in or sign up",
  ];

  return genericValues.some(
    (genericValue) =>
      normalized ===
        genericValue ||
      normalized.startsWith(
        `${genericValue} `,
      ),
  );
}

function firstMeaningfulValue(
  ...values:
    Array<
      string | undefined
    >
): string | undefined {
  return values.find(
    (value) =>
      Boolean(value) &&
      !isGenericMetaText(
        value as string,
      ),
  );
}

function cleanText(
  value: unknown,
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    normalizeText(value);

  return normalized ||
    undefined;
}

function cleanUrl(
  value: unknown,
): string | undefined {
  const normalized =
    cleanText(value);

  if (!normalized) {
    return undefined;
  }

  try {
    const url =
      new URL(normalized);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    )
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function limitText(
  value: string,
  maxLength: number,
): string {
  if (
    value.length <= maxLength
  ) {
    return value;
  }

  return `${value
    .slice(
      0,
      maxLength - 1,
    )
    .trim()}…`;
}

function normalizeHostname(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(/^www\./, "");
}

function normalizeText(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}
