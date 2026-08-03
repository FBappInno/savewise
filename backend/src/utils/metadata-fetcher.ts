import * as cheerio from "cheerio";

import { validatePublicUrl } from "./url-validator";
import type { PageMetadata } from "../types/page-metadata";

const MAX_HTML_LENGTH = 1_500_000;

function firstValue(
  ...values: Array<string | undefined>
): string | undefined {
  return values
    .map((value) => value?.trim())
    .find((value) => Boolean(value));
}

function toAbsoluteUrl(
  value: string | undefined,
  baseUrl: URL,
): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

export async function fetchPageMetadata(
  rawUrl: string,
): Promise<PageMetadata> {
  const url = await validatePublicUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "SaveWiseBot/0.1 (+https://savewise.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Website returned HTTP ${response.status}.`,
      );
    }

    const contentType =
      response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html")) {
      throw new Error(
        "The URL does not point to an HTML page.",
      );
    }

    const html = (await response.text()).slice(
      0,
      MAX_HTML_LENGTH,
    );

    const $ = cheerio.load(html);
    const finalUrl = new URL(response.url || url.toString());

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
      $('meta[property="article:published_time"]').attr(
        "content",
      ),
      $("time[datetime]").first().attr("datetime"),
    );

    const siteName = firstValue(
      $('meta[property="og:site_name"]').attr("content"),
      finalUrl.hostname.replace(/^www\./, ""),
    );

    return {
      url: finalUrl.toString(),
      title: title ?? "Untitled content",
      description,
      author,
      thumbnailUrl: toAbsoluteUrl(
        thumbnailValue,
        finalUrl,
      ),
      siteName,
      publishedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}