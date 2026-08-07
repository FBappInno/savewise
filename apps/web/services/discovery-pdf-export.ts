import type {
  Discovery,
} from "@savewise/shared";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

const PAGE_WIDTH =
  595.28;

const PAGE_HEIGHT =
  841.89;

const MARGIN =
  52;

const CONTENT_WIDTH =
  PAGE_WIDTH -
  MARGIN * 2;

type PdfContext = {
  pdf:
    PDFDocument;

  page:
    PDFPage;

  regular:
    PDFFont;

  bold:
    PDFFont;

  y:
    number;
};

export async function exportDiscoveryAsPdf(
  discovery:
    Discovery,
): Promise<void> {
  const pdf =
    await PDFDocument.create();

  const regular =
    await pdf.embedFont(
      StandardFonts.Helvetica,
    );

  const bold =
    await pdf.embedFont(
      StandardFonts.HelveticaBold,
    );

  const firstPage =
    pdf.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  const context:
    PdfContext = {
      pdf,
      page:
        firstPage,
      regular,
      bold,
      y:
        PAGE_HEIGHT -
        MARGIN,
    };

  const title =
    discovery.improvedTitle ||
    discovery.title ||
    "SaveWise Discovery";

  drawBrandHeader(
    context,
  );

  context.y -=
    28;

  drawWrappedText(
    context,
    title,
    {
      font:
        bold,

      size:
        24,

      lineHeight:
        29,

      color:
        rgb(
          0.055,
          0.105,
          0.165,
        ),
    },
  );

  context.y -=
    5;

  drawText(
    context,
    [
      getWorkspaceLabel(
        discovery,
      ),
      formatDate(
        discovery.createdAt,
      ),
      getCaptureLabel(
        discovery,
      ),
    ]
      .filter(Boolean)
      .join("  ·  "),
    {
      font:
        regular,

      size:
        10,

      color:
        rgb(
          0.39,
          0.44,
          0.5,
        ),
    },
  );

  drawDivider(
    context,
  );

  if (
    discovery.summary
  ) {
    drawSectionTitle(
      context,
      "ZUSAMMENFASSUNG",
    );

    drawWrappedText(
      context,
      discovery.summary,
      {
        font:
          regular,

        size:
          11.5,

        lineHeight:
          17,
      },
    );

    context.y -=
      10;
  }

  if (
    discovery.classification
  ) {
    drawSectionTitle(
      context,
      "WISSENSPFAD",
    );

    const path = [
      discovery.classification
        .secondaryCategory,
      discovery.classification
        .topic,
      ...discovery.classification
        .subtopics,
    ]
      .filter(Boolean)
      .join("  >  ");

    drawWrappedText(
      context,
      path || "–",
      {
        font:
          regular,

        size:
          11.5,

        lineHeight:
          17,

        color:
          rgb(
            0.06,
            0.43,
            0.59,
          ),
      },
    );

    context.y -=
      10;
  }

  if (
    discovery.keywords.length >
    0
  ) {
    drawSectionTitle(
      context,
      "SCHLAGWÖRTER",
    );

    drawWrappedText(
      context,
      discovery.keywords.join(
        "  ·  ",
      ),
      {
        font:
          regular,

        size:
          10.5,

        lineHeight:
          16,

        color:
          rgb(
            0.27,
            0.33,
            0.39,
          ),
      },
    );

    context.y -=
      10;
  }

  drawSectionTitle(
    context,
    "DETAILS",
  );

  drawMetadataRow(
    context,
    "Workspace",
    getWorkspaceLabel(
      discovery,
    ),
  );

  drawMetadataRow(
    context,
    "Sprache",
    discovery.language ??
      "–",
  );

  drawMetadataRow(
    context,
    "Erstellt",
    formatDateTime(
      discovery.createdAt,
    ),
  );

  drawMetadataRow(
    context,
    "Aktualisiert",
    formatDateTime(
      discovery.updatedAt,
    ),
  );

  if (
    discovery.author
  ) {
    drawMetadataRow(
      context,
      "Autor",
      discovery.author,
    );
  }

  if (
    typeof discovery.confidence ===
    "number"
  ) {
    drawMetadataRow(
      context,
      "KI-Confidence",
      `${Math.round(
        discovery.confidence *
        100,
      )}%`,
    );
  }

  if (
    discovery.attachment
  ) {
    context.y -=
      12;

    drawSectionTitle(
      context,
      "DATEI",
    );

    drawMetadataRow(
      context,
      "Dateiname",
      discovery.attachment
        .fileName,
    );

    drawMetadataRow(
      context,
      "Dateityp",
      discovery.attachment
        .captureType
        .toUpperCase(),
    );

    drawMetadataRow(
      context,
      "Größe",
      formatFileSize(
        discovery.attachment
          .sizeBytes,
      ),
    );

    if (
      discovery.attachment
        .pageCount
    ) {
      drawMetadataRow(
        context,
        "Seiten",
        String(
          discovery.attachment
            .pageCount,
        ),
      );
    }
  }

  if (
    discovery.url
  ) {
    context.y -=
      12;

    drawSectionTitle(
      context,
      "ORIGINALQUELLE",
    );

    drawWrappedText(
      context,
      discovery.url,
      {
        font:
          regular,

        size:
          9.5,

        lineHeight:
          14,

        color:
          rgb(
            0.06,
            0.43,
            0.59,
          ),
      },
    );
  }

  addFooters(
    pdf,
    regular,
  );

  pdf.setTitle(
    title,
  );

  pdf.setSubject(
    "SaveWise Discovery",
  );

  pdf.setCreator(
    "SaveWise",
  );

  pdf.setProducer(
    "SaveWise",
  );

  const bytes =
    await pdf.save();

  const blob =
    new Blob(
      [new Uint8Array(bytes)],
      {
        type:
          "application/pdf",
      },
    );

  const objectUrl =
    URL.createObjectURL(
      blob,
    );

  const link =
    document.createElement(
      "a",
    );

  link.href =
    objectUrl;

  link.download =
    `${createSafeFilename(
      title,
    )}.pdf`;

  document.body.appendChild(
    link,
  );

  link.click();
  link.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        objectUrl,
      );
    },
    1000,
  );
}

function drawBrandHeader(
  context:
    PdfContext,
): void {
  context.page.drawText(
    "SaveWise",
    {
      x:
        MARGIN,

      y:
        context.y,

      size:
        15,

      font:
        context.bold,

      color:
        rgb(
          0.04,
          0.55,
          0.72,
        ),
    },
  );

  context.page.drawText(
    "PERSONAL INTELLIGENCE",
    {
      x:
        MARGIN +
        78,

      y:
        context.y +
        1.5,

      size:
        7.5,

      font:
        context.bold,

      color:
        rgb(
          0.42,
          0.48,
          0.54,
        ),
    },
  );
}

function drawSectionTitle(
  context:
    PdfContext,

  text:
    string,
): void {
  ensureSpace(
    context,
    30,
  );

  context.page.drawText(
    text,
    {
      x:
        MARGIN,

      y:
        context.y,

      size:
        8,

      font:
        context.bold,

      color:
        rgb(
          0.38,
          0.43,
          0.49,
        ),
    },
  );

  context.y -=
    17;
}

function drawMetadataRow(
  context:
    PdfContext,

  label:
    string,

  value:
    string,
): void {
  ensureSpace(
    context,
    22,
  );

  context.page.drawText(
    label,
    {
      x:
        MARGIN,

      y:
        context.y,

      size:
        9,

      font:
        context.bold,

      color:
        rgb(
          0.4,
          0.45,
          0.51,
        ),
    },
  );

  const safeValue =
    sanitizePdfText(
      value,
    );

  const wrapped =
    wrapText(
      safeValue,
      context.regular,
      9.5,
      CONTENT_WIDTH -
      125,
    );

  context.page.drawText(
    wrapped[0] ??
      "–",
    {
      x:
        MARGIN +
        125,

      y:
        context.y,

      size:
        9.5,

      font:
        context.regular,

      color:
        rgb(
          0.08,
          0.12,
          0.17,
        ),
    },
  );

  context.y -=
    17;
}

function drawDivider(
  context:
    PdfContext,
): void {
  context.y -=
    18;

  context.page.drawLine({
    start: {
      x:
        MARGIN,

      y:
        context.y,
    },

    end: {
      x:
        PAGE_WIDTH -
        MARGIN,

      y:
        context.y,
    },

    thickness:
      0.7,

    color:
      rgb(
        0.86,
        0.88,
        0.9,
      ),
  });

  context.y -=
    24;
}

function drawText(
  context:
    PdfContext,

  text:
    string,

  options: {
    font:
      PDFFont;

    size:
      number;

    color?:
      ReturnType<
        typeof rgb
      >;
  },
): void {
  ensureSpace(
    context,
    options.size +
    5,
  );

  context.page.drawText(
    sanitizePdfText(
      text,
    ),
    {
      x:
        MARGIN,

      y:
        context.y,

      size:
        options.size,

      font:
        options.font,

      color:
        options.color ??
        rgb(
          0.08,
          0.12,
          0.17,
        ),
    },
  );

  context.y -=
    options.size +
    4;
}

function drawWrappedText(
  context:
    PdfContext,

  text:
    string,

  options: {
    font:
      PDFFont;

    size:
      number;

    lineHeight:
      number;

    color?:
      ReturnType<
        typeof rgb
      >;
  },
): void {
  const paragraphs =
    sanitizePdfText(
      text,
    ).split(
      /\r?\n/,
    );

  for (
    const paragraph
    of paragraphs
  ) {
    const lines =
      wrapText(
        paragraph ||
        " ",
        options.font,
        options.size,
        CONTENT_WIDTH,
      );

    for (
      const line
      of lines
    ) {
      ensureSpace(
        context,
        options.lineHeight,
      );

      context.page.drawText(
        line,
        {
          x:
            MARGIN,

          y:
            context.y,

          size:
            options.size,

          font:
            options.font,

          color:
            options.color ??
            rgb(
              0.08,
              0.12,
              0.17,
            ),
        },
      );

      context.y -=
        options.lineHeight;
    }
  }
}

function ensureSpace(
  context:
    PdfContext,

  requiredHeight:
    number,
): void {
  if (
    context.y -
    requiredHeight >
    MARGIN
  ) {
    return;
  }

  context.page =
    context.pdf.addPage([
      PAGE_WIDTH,
      PAGE_HEIGHT,
    ]);

  context.y =
    PAGE_HEIGHT -
    MARGIN;
}

function wrapText(
  text:
    string,

  font:
    PDFFont,

  size:
    number,

  maxWidth:
    number,
): string[] {
  const words =
    text
      .split(
        /\s+/,
      )
      .filter(Boolean);

  if (
    words.length ===
    0
  ) {
    return [
      " ",
    ];
  }

  const lines:
    string[] = [];

  let current =
    "";

  for (
    const word
    of words
  ) {
    const candidate =
      current
        ? `${current} ${word}`
        : word;

    if (
      font.widthOfTextAtSize(
        candidate,
        size,
      ) <=
      maxWidth
    ) {
      current =
        candidate;

      continue;
    }

    if (current) {
      lines.push(
        current,
      );
    }

    current =
      word;
  }

  if (current) {
    lines.push(
      current,
    );
  }

  return lines;
}

function addFooters(
  pdf:
    PDFDocument,

  font:
    PDFFont,
): void {
  const pages =
    pdf.getPages();

  pages.forEach(
    (
      page,
      index,
    ) => {
      page.drawLine({
        start: {
          x:
            MARGIN,

          y:
            35,
        },

        end: {
          x:
            PAGE_WIDTH -
            MARGIN,

          y:
            35,
        },

        thickness:
          0.5,

        color:
          rgb(
            0.88,
            0.9,
            0.92,
          ),
      });

      page.drawText(
        "Exportiert mit SaveWise",
        {
          x:
            MARGIN,

          y:
            20,

          size:
            7.5,

          font,

          color:
            rgb(
              0.48,
              0.52,
              0.57,
            ),
        },
      );

      const pageLabel =
        `${index + 1} / ${pages.length}`;

      const width =
        font.widthOfTextAtSize(
          pageLabel,
          7.5,
        );

      page.drawText(
        pageLabel,
        {
          x:
            PAGE_WIDTH -
            MARGIN -
            width,

          y:
            20,

          size:
            7.5,

          font,

          color:
            rgb(
              0.48,
              0.52,
              0.57,
            ),
        },
      );
    },
  );
}

function getWorkspaceLabel(
  discovery:
    Discovery,
): string {
  return (
    discovery.workspaceId ??
    "private"
  ) ===
  "business"
    ? "Geschäftlich"
    : "Privat";
}

function getCaptureLabel(
  discovery:
    Discovery,
): string {
  switch (
    discovery.attachment
      ?.captureType ??
    discovery.captureType
  ) {
    case "pdf":
      return "PDF";

    case "image":
      return "Bild";

    case "audio":
      return "Audio";

    case "note":
      return "Notiz";

    default:
      return "Link";
  }
}

function createSafeFilename(
  value:
    string,
): string {
  return (
    value
      .normalize(
        "NFKD",
      )
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(
        /[^a-zA-Z0-9äöüÄÖÜß_-]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      )
      .slice(
        0,
        80,
      ) ||
    "SaveWise-Discovery"
  );
}

function sanitizePdfText(
  value:
    string,
): string {
  return value
    .replaceAll(
      "→",
      "->",
    )
    .replaceAll(
      "›",
      ">",
    )
    .replaceAll(
      "•",
      "-",
    )
    .replaceAll(
      "–",
      "-",
    )
    .replaceAll(
      "—",
      "-",
    )
    .replaceAll(
      "“",
      '"',
    )
    .replaceAll(
      "”",
      '"',
    )
    .replaceAll(
      "„",
      '"',
    )
    .replaceAll(
      "’",
      "'",
    );
}

function formatDate(
  value:
    string,
): string {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

function formatDateTime(
  value:
    string,
): string {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

function formatFileSize(
  bytes:
    number,
): string {
  if (
    bytes <
    1024 *
    1024
  ) {
    return `${Math.max(
      1,
      Math.round(
        bytes /
        1024,
      ),
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}
