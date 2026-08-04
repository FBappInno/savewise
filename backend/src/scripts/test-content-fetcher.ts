import assert from "node:assert/strict";
import test from "node:test";

import { createUrlFallbackMetadata, parseHtml } from "../utils/metadata-fetcher";
import { canonicalizeDiscoveryUrl } from "../utils/discovery-url";
import { resolveVideoMetadata } from "../utils/video-metadata-resolver";

test("extracts metadata and readable article text", () => {
  const metadata = parseHtml(
    `<!doctype html>
      <html lang="de">
        <head>
          <title>Fallback title</title>
          <meta property="og:title" content="Mensch und Cybersicherheit">
          <meta name="description" content="Ein Testartikel über Phishing.">
          <meta property="article:published_time" content="2026-08-03">
        </head>
        <body>
          <nav>Navigation ohne Wissenswertes</nav>
          <article><h1>Mensch und Cybersicherheit</h1><p>Phishing nutzt häufig Zeitdruck und menschliche Fehler aus.</p></article>
          <script>throw new Error("must not be extracted")</script>
        </body>
      </html>`,
    new URL("https://example.com/article"),
    "browser-compatible",
  );

  assert.equal(metadata.title, "Mensch und Cybersicherheit");
  assert.equal(metadata.contentType, "html");
  assert.equal(metadata.fetchStrategy, "browser-compatible");
  assert.match(metadata.extractedText ?? "", /Phishing nutzt/);
  assert.doesNotMatch(metadata.extractedText ?? "", /Navigation/);
  assert.doesNotMatch(metadata.extractedText ?? "", /must not be extracted/);
});

test("resolves relative preview images", () => {
  const metadata = parseHtml(
    '<html><head><meta property="og:image" content="/preview.jpg"><title>Test</title></head><body>Content</body></html>',
    new URL("https://example.com/articles/one"),
  );

  assert.equal(metadata.thumbnailUrl, "https://example.com/preview.jpg");
});

test("extracts structured video context and transcript", () => {
  const metadata = parseHtml(
    `<html><head><title>Generic video page</title></head><body>
      <script type="application/ld+json">
        {"@type":"VideoObject","name":"Omega-3 einfach erklärt","description":"Wirkung und Quellen von Omega-3.","transcript":"Omega-3-Fettsäuren kommen unter anderem in Fisch und Algen vor."}
      </script>
    </body></html>`,
    new URL("https://example.com/video/omega-3"),
  );

  assert.equal(metadata.mediaType, "video");
  assert.equal(metadata.title, "Omega-3 einfach erklärt");
  assert.match(metadata.videoTranscript ?? "", /Fisch und Algen/);
  assert.match(metadata.extractedText ?? "", /Wirkung und Quellen/);
});

test("loads creator caption and thumbnail from video oEmbed metadata", async () => {
  const mockFetch: typeof fetch = async () => new Response(JSON.stringify({
    title: "Drei Übungen für einen gesunden Rücken",
    author_name: "Physio Kanal",
    thumbnail_url: "https://cdn.example.com/video-cover.jpg",
    provider_name: "TikTok",
  }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });

  const metadata = await resolveVideoMetadata(
    new URL("https://www.tiktok.com/@physio/video/123"),
    mockFetch,
  );

  assert.equal(metadata?.mediaType, "video");
  assert.equal(metadata?.title, "Drei Übungen für einen gesunden Rücken");
  assert.equal(metadata?.author, "Physio Kanal");
  assert.equal(metadata?.thumbnailUrl, "https://cdn.example.com/video-cover.jpg");
});

test("derives usable metadata from a blocked product URL", () => {
  const metadata = createUrlFallbackMetadata(new URL(
    "https://www.printables.com/model/1703801-beste-mama-sign-mothers-day-gift-3d-printed-decor",
  ));

  assert.equal(metadata.fetchStrategy, "url-derived");
  assert.equal(metadata.title, "Beste mama sign mothers day gift 3d printed decor");
  assert.match(metadata.extractedText ?? "", /Printables/i);
});

test("canonicalizes tracking variants to the same discovery URL", () => {
  const first = canonicalizeDiscoveryUrl(
    "https://www.example.com/article/?utm_source=newsletter&b=2&a=1#details",
  );
  const second = canonicalizeDiscoveryUrl(
    "https://example.com/article?a=1&b=2",
  );

  assert.equal(first, second);
});
