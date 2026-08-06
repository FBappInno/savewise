
import {
  Share,
} from "react-native";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import type {
  Discovery,
} from "@/types/discovery";

import {
  getDiscoveryHierarchy,
} from "@/utils/knowledge-hierarchy";

export async function shareDiscovery(
  discovery: Discovery,
): Promise<void> {
  const hierarchy =
    getDiscoveryHierarchy(
      discovery,
    );

  const title =
    discovery.improvedTitle ||
    discovery.title;

  const path = [
    hierarchy.domain,
    hierarchy.topic,
    hierarchy.subtopics[0],
  ]
    .filter(Boolean)
    .join(" › ");

  const message = [
    title,
    path,
    discovery.summary,
    discovery.url,
  ]
    .filter(Boolean)
    .join("\n\n");

  await Share.share(
    {
      message,
      title,
      url:
        discovery.url ||
        undefined,
    },
    {
      dialogTitle:
        "Discovery teilen",
      subject: title,
    },
  );
}

export async function exportDiscoveryAsPdf(
  discovery: Discovery,
): Promise<string> {
  const html =
    buildDiscoveryPdfHtml(
      discovery,
    );

  const result =
    await Print.printToFileAsync({
      html,
      base64: false,
    });

  const sharingAvailable =
    await Sharing.isAvailableAsync();

  if (!sharingAvailable) {
    throw new Error(
      "Das Speichern oder Teilen von PDF-Dateien ist auf diesem Gerät nicht verfügbar.",
    );
  }

  const title =
    discovery.improvedTitle ||
    discovery.title;

  await Sharing.shareAsync(
    result.uri,
    {
      dialogTitle:
        "SaveWise-PDF speichern",
      mimeType:
        "application/pdf",
      UTI:
        "com.adobe.pdf",
    },
  );

  return result.uri;
}

function buildDiscoveryPdfHtml(
  discovery: Discovery,
): string {
  const hierarchy =
    getDiscoveryHierarchy(
      discovery,
    );

  const title =
    escapeHtml(
      discovery.improvedTitle ||
      discovery.title,
    );

  const summary =
    escapeHtml(
      discovery.summary ||
      "Keine Zusammenfassung vorhanden.",
    );

  const domain =
    escapeHtml(
      hierarchy.domain ||
      "Nicht zugeordnet",
    );

  const topic =
    escapeHtml(
      hierarchy.topic ||
      "Nicht zugeordnet",
    );

  const subtopics =
    hierarchy.subtopics.length > 0
      ? hierarchy.subtopics
          .map(escapeHtml)
          .join(", ")
      : "Nicht zugeordnet";

  const author =
    escapeHtml(
      discovery.author ||
      "Unbekannt",
    );

  const source =
    escapeHtml(
      discovery.url ||
      "Keine Quelle vorhanden",
    );

  const createdAt =
    formatPdfDate(
      discovery.createdAt,
    );

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />

  <style>
    @page {
      margin: 32px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      color: #172033;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
      font-size: 12px;
      line-height: 1.55;
      margin: 0;
    }

    .header {
      align-items: center;
      border-bottom: 2px solid #38bdf8;
      display: flex;
      justify-content: space-between;
      padding-bottom: 17px;
    }

    .brand {
      color: #0369a1;
      font-size: 21px;
      font-weight: 900;
      letter-spacing: 1.2px;
    }

    .export {
      color: #64748b;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    h1 {
      color: #0f172a;
      font-size: 27px;
      line-height: 1.22;
      margin: 28px 0 8px;
    }

    .meta {
      color: #64748b;
      margin-bottom: 25px;
    }

    .section {
      border: 1px solid #dbe7f0;
      border-radius: 13px;
      margin-top: 17px;
      padding: 17px;
    }

    .section-label {
      color: #0284c7;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1.1px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .summary {
      font-size: 13px;
      white-space: pre-wrap;
    }

    .hierarchy-row {
      border-bottom: 1px solid #e8eef4;
      display: flex;
      gap: 16px;
      padding: 9px 0;
    }

    .hierarchy-row:last-child {
      border-bottom: none;
    }

    .hierarchy-label {
      color: #64748b;
      font-size: 10px;
      font-weight: 800;
      width: 105px;
    }

    .hierarchy-value {
      color: #0f172a;
      flex: 1;
      font-weight: 800;
    }

    .source {
      color: #0369a1;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    .footer {
      border-top: 1px solid #dbe7f0;
      color: #94a3b8;
      font-size: 9px;
      margin-top: 32px;
      padding-top: 13px;
      text-align: center;
    }
  </style>
</head>

<body>
  <div class="header">
    <div class="brand">SAVEWISE</div>
    <div class="export">Knowledge Export</div>
  </div>

  <h1>${title}</h1>

  <div class="meta">
    ${author} · gespeichert am ${createdAt}
  </div>

  <div class="section">
    <div class="section-label">Zusammenfassung</div>
    <div class="summary">${summary}</div>
  </div>

  <div class="section">
    <div class="section-label">Wissenspfad</div>

    <div class="hierarchy-row">
      <div class="hierarchy-label">Domäne</div>
      <div class="hierarchy-value">${domain}</div>
    </div>

    <div class="hierarchy-row">
      <div class="hierarchy-label">Topic</div>
      <div class="hierarchy-value">${topic}</div>
    </div>

    <div class="hierarchy-row">
      <div class="hierarchy-label">Unterthema</div>
      <div class="hierarchy-value">${subtopics}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Quelle</div>
    <div class="source">${source}</div>
  </div>

  <div class="footer">
    Exportiert mit SaveWise
  </div>
</body>
</html>
`;
}

function escapeHtml(
  value: string,
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPdfDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "de-CH",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}
