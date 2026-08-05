import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";

import { ContentFetchError } from "../types/content-fetch-error";
import type { PageMetadata } from "../types/page-metadata";
import { validatePublicUrl } from "./url-validator";
import { resolveMetaMetadata } from "./meta-metadata-resolver";
import { resolveVideoMetadata } from "./video-metadata-resolver";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_PDF_BYTES = 12_000_000;
const MAX_EXTRACTED_TEXT_LENGTH = 16_000;

type FetchStrategy = PageMetadata["fetchStrategy"];

const STANDARD_HEADERS = {
  "User-Agent": "SaveWiseBot/0.2 (+https://savewise.app)",
  Accept: "text/html,application/xhtml+xml,application/pdf",
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/138.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9," +
    "application/pdf;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "de-CH,de;q=0.9,en;q=0.7",
  "Cache-Control": "no-cache",
};

export async function fetchPageMetadata(
  rawUrl: string,
): Promise<PageMetadata> {
  let url: URL;
  try {
    url = await validatePublicUrl(rawUrl);
  } catch (error) {
    throw new ContentFetchError(
      "invalid_url",
      error instanceof Error ? error.message : "Invalid URL.",
      undefined,
      { cause: error },
    );
  }

  const metaMetadata =
    await resolveMetaMetadata(url);

  if (metaMetadata) {
    return metaMetadata;
  }

  const videoMetadataPromise =
    resolveVideoMetadata(url);

  let pageMetadata: PageMetadata;
  try {
    const standardResponse = await fetchWithTimeout(
      url,
      STANDARD_HEADERS,
    );

    pageMetadata = await parseResponse(standardResponse, "standard");
  } catch (error) {
    const videoMetadata = await videoMetadataPromise;
    if (videoMetadata) {
      return {
        url: url.toString(),
        ...videoMetadata,
        contentType: "html",
        fetchStrategy: "browser-compatible",
      };
    }

    if (!supportsUrlFallback(error)) throw error;

    try {
      const browserResponse = await fetchWithTimeout(url, BROWSER_HEADERS);
      pageMetadata = await parseResponse(browserResponse, "browser-compatible");
    } catch (browserError) {
      if (!supportsUrlFallback(browserError)) throw browserError;
      return createUrlFallbackMetadata(url);
    }
  }

  const videoMetadata = await videoMetadataPromise;
  return videoMetadata
    ? mergeVideoMetadata(pageMetadata, videoMetadata)
    : pageMetadata;
}

export function createUrlFallbackMetadata(url: URL): PageMetadata {
  const hostname = url.hostname.replace(/^www\./, "");
  const lastPathSegment = decodeURIComponent(
    url.pathname.split("/").filter(Boolean).at(-1) ?? "",
  )
    .replace(/^\d+-/, "")
    .replace(/-\d{5,}$/, "");
  const readableTitle = normalizeText(lastPathSegment.replace(/[-_]+/g, " "));
  const title = readableTitle
    ? readableTitle.charAt(0).toLocaleUpperCase() + readableTitle.slice(1)
    : hostname;

  return {
    url: url.toString(),
    title,
    description: `Public link from ${hostname}. The website blocked automated content extraction; title and topic are derived from the URL.`,
    siteName: hostname,
    extractedText: `${title}. Public content hosted on ${hostname}.`,
    contentType: "html",
    fetchStrategy: "url-derived",
  };
}

function supportsUrlFallback(error: unknown): boolean {
  return error instanceof ContentFetchError && [
    "access_denied",
    "authentication_required",
    "timeout",
    "network_error",
    "upstream_error",
  ].includes(error.code);
}

async function fetchWithTimeout(
  initialUrl: URL,
  headers: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let url = initialUrl;
    for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers,
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) {
        return response;
      }
      const location = response.headers.get("location");
      if (!location) return response;
      response.body?.cancel().catch(() => undefined);
      url = await validatePublicUrl(new URL(location, url).toString());
    }
    throw new ContentFetchError(
      "network_error",
      "The website redirected too many times.",
      508,
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ContentFetchError(
        "timeout",
        "The website did not respond in time.",
        undefined,
        { cause: error },
      );
    }
    throw new ContentFetchError(
      "network_error",
      "The website could not be reached.",
      undefined,
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function parseResponse(
  response: Response,
  fetchStrategy: FetchStrategy,
): Promise<PageMetadata> {
  assertSuccessfulResponse(response);

  const contentType = (response.headers.get("content-type") ?? "")
    .toLowerCase();
  const finalUrl = new URL(response.url);
  const isPdf =
    contentType.includes("application/pdf") ||
    finalUrl.pathname.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return parsePdfResponse(response, finalUrl, fetchStrategy);
  }
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("application/xhtml+xml")
  ) {
    throw new ContentFetchError(
      "unsupported_content",
      `This content type is not supported: ${contentType || "unknown"}.`,
      415,
    );
  }

  const bytes = await readLimitedBody(response, MAX_HTML_BYTES);
  const html = new TextDecoder(detectCharset(contentType)).decode(bytes);
  return parseHtml(html, finalUrl, fetchStrategy);
}

export function parseHtml(
  html: string,
  finalUrl: URL,
  fetchStrategy: FetchStrategy = "standard",
): PageMetadata {
  const $ = cheerio.load(html);
  const title = firstValue(
    $('meta[property="og:title"]').attr("content"),
    $('meta[name="twitter:title"]').attr("content"),
    $("title").first().text(),
    finalUrl.hostname,
  );
  const description = firstValue(
    $('meta[property="og:description"]').attr("content"),
    $('meta[name="twitter:description"]').attr("content"),
    $('meta[name="description"]').attr("content"),
  );
  const author = firstValue(
    $('meta[name="author"]').attr("content"),
    $('meta[property="article:author"]').attr("content"),
  );
  const thumbnailValue = firstValue(
    $('meta[property="og:image"]').attr("content"),
    $('meta[name="twitter:image"]').attr("content"),
    $('meta[name="twitter:image:src"]').attr("content"),
  );
  const publishedAt = firstValue(
    $('meta[property="article:published_time"]').attr("content"),
    $("time[datetime]").first().attr("datetime"),
  );
  const siteName = firstValue(
    $('meta[property="og:site_name"]').attr("content"),
    finalUrl.hostname.replace(/^www\./, ""),
  );
  const structuredVideo = extractStructuredVideo($);

  $("script,style,noscript,svg,nav,footer,form,dialog").remove();
  const contentRoot = $("article").first().length
    ? $("article").first()
    : $("main").first().length
      ? $("main").first()
      : $("body").first();
  const extractedText = normalizeText(contentRoot.text()).slice(
    0,
    MAX_EXTRACTED_TEXT_LENGTH,
  );

  if (!title && !description && !extractedText) {
    throw new ContentFetchError(
      "empty_content",
      "No readable content was found on the website.",
      422,
    );
  }

  return {
    url: finalUrl.toString(),
    title: firstValue(structuredVideo.title, title) ?? "Untitled content",
    description: firstValue(structuredVideo.description, description),
    author,
    thumbnailUrl: toAbsoluteUrl(thumbnailValue, finalUrl),
    siteName,
    publishedAt,
    extractedText: [
      structuredVideo.transcript,
      structuredVideo.description,
      extractedText,
    ].filter(Boolean).join("\n").slice(0, MAX_EXTRACTED_TEXT_LENGTH) || undefined,
    mediaType: structuredVideo.isVideo ? "video" : undefined,
    videoTranscript: structuredVideo.transcript,
    contentType: "html",
    fetchStrategy,
  };
}

function mergeVideoMetadata(
  page: PageMetadata,
  video: Awaited<ReturnType<typeof resolveVideoMetadata>> & object,
): PageMetadata {
  const pageTitleIsGeneric = /^(tiktok|instagram|youtube)(\s*-.*)?$/i.test(page.title);
  const extractedText = [
    video.extractedText,
    page.videoTranscript,
    page.extractedText,
  ].filter(Boolean).join("\n").slice(0, MAX_EXTRACTED_TEXT_LENGTH);

  return {
    ...page,
    title: pageTitleIsGeneric ? video.title : firstValue(video.title, page.title)!,
    description: firstValue(video.description, page.description),
    author: firstValue(video.author, page.author),
    thumbnailUrl: firstValue(video.thumbnailUrl, page.thumbnailUrl),
    siteName: firstValue(video.siteName, page.siteName),
    extractedText: extractedText || undefined,
    mediaType: "video",
    videoPlatform: video.videoPlatform,
  };
}

function extractStructuredVideo($: cheerio.CheerioAPI): {
  isVideo: boolean;
  title?: string;
  description?: string;
  transcript?: string;
} {
  const candidates: unknown[] = [];
  $('script[type="application/ld+json"]').each((_index, element) => {
    try {
      const parsed = JSON.parse($(element).text()) as unknown;
      candidates.push(...flattenStructuredData(parsed));
    } catch {
      // Ignore malformed structured data and continue with regular metadata.
    }
  });

  const video = candidates.find((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const type = (candidate as Record<string, unknown>)["@type"];
    return type === "VideoObject" ||
      (Array.isArray(type) && type.includes("VideoObject"));
  }) as Record<string, unknown> | undefined;

  if (!video) return { isVideo: false };
  return {
    isVideo: true,
    title: firstValue(asText(video.name), asText(video.headline)),
    description: asText(video.description),
    transcript: firstValue(asText(video.transcript), asText(video.caption)),
  };
}

function flattenStructuredData(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(flattenStructuredData);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [record, ...flattenStructuredData(record["@graph"])] ;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" ? normalizeText(value) || undefined : undefined;
}

async function parsePdfResponse(
  response: Response,
  finalUrl: URL,
  fetchStrategy: FetchStrategy,
): Promise<PageMetadata> {
  const bytes = await readLimitedBody(response, MAX_PDF_BYTES);
  const parser = new PDFParse({ data: bytes });
  try {
    const info = await parser.getInfo();
    const text = await parser.getText();
    const extractedText = normalizeText(text.text).slice(
      0,
      MAX_EXTRACTED_TEXT_LENGTH,
    );
    if (!extractedText) {
      throw new ContentFetchError(
        "empty_content",
        "The PDF contains no extractable text.",
        422,
      );
    }
    return {
      url: finalUrl.toString(),
      title: firstValue(
        info.info?.Title,
        filenameTitle(finalUrl),
      ) ?? "PDF document",
      author: firstValue(info.info?.Author),
      extractedText,
      siteName: finalUrl.hostname.replace(/^www\./, ""),
      contentType: "pdf",
      fetchStrategy,
    };
  } catch (error) {
    if (error instanceof ContentFetchError) {
      throw error;
    }
    throw new ContentFetchError(
      "unsupported_content",
      "The PDF could not be read.",
      422,
      { cause: error },
    );
  } finally {
    await parser.destroy();
  }
}

function assertSuccessfulResponse(response: Response): void {
  if (response.ok) return;
  const status = response.status;
  if (status === 401) {
    throw new ContentFetchError(
      "authentication_required",
      "This website requires authentication.",
      status,
    );
  }
  if (status === 403) {
    throw new ContentFetchError(
      "access_denied",
      "This website blocks automated access.",
      status,
    );
  }
  if (status === 429) {
    throw new ContentFetchError(
      "rate_limited",
      "This website is temporarily rate limiting requests.",
      status,
    );
  }
  throw new ContentFetchError(
    status >= 500 ? "upstream_error" : "network_error",
    `Website returned HTTP ${status}.`,
    status,
  );
}

async function readLimitedBody(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array> {
  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    throw new ContentFetchError(
      "content_too_large",
      `The content exceeds the ${Math.round(maxBytes / 1_000_000)} MB limit.`,
      413,
    );
  }
  if (!response.body) {
    throw new ContentFetchError("empty_content", "The response was empty.", 422);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ContentFetchError(
        "content_too_large",
        `The content exceeds the ${Math.round(maxBytes / 1_000_000)} MB limit.`,
        413,
      );
    }
    chunks.push(value);
  }

  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function firstValue(...values: Array<string | undefined>): string | undefined {
  return values.map((value) => value?.trim()).find(Boolean);
}

function toAbsoluteUrl(value: string | undefined, baseUrl: URL) {
  if (!value) return undefined;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function detectCharset(contentType: string): string {
  const charset = /charset=([^;\s]+)/i.exec(contentType)?.[1];
  return charset?.replace(/["']/g, "") || "utf-8";
}

function filenameTitle(url: URL): string | undefined {
  const filename = decodeURIComponent(url.pathname.split("/").pop() ?? "")
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return filename || undefined;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
