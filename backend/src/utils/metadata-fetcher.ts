import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";

import { ContentFetchError } from "../types/content-fetch-error";
import type { PageMetadata } from "../types/page-metadata";
import { validatePublicUrl } from "./url-validator";

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

  const standardResponse = await fetchWithTimeout(
    url,
    STANDARD_HEADERS,
  );

  if (standardResponse.status === 403 || standardResponse.status === 406) {
    standardResponse.body?.cancel().catch(() => undefined);
    const browserResponse = await fetchWithTimeout(url, BROWSER_HEADERS);
    return parseResponse(browserResponse, "browser-compatible");
  }

  return parseResponse(standardResponse, "standard");
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
    title: title ?? "Untitled content",
    description,
    author,
    thumbnailUrl: toAbsoluteUrl(thumbnailValue, finalUrl),
    siteName,
    publishedAt,
    extractedText: extractedText || undefined,
    contentType: "html",
    fetchStrategy,
  };
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
