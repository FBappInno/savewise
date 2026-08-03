import assert from "node:assert/strict";
import test from "node:test";

import { parseHtml } from "../utils/metadata-fetcher";

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
