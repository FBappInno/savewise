import {
  randomUUID,
} from "node:crypto";

/*
 * Muss vor PDFParse geladen werden.
 * Das stellt den PDF.js-Worker in
 * Railway und Node korrekt bereit.
 */
import "pdf-parse/worker";

import {
  PDFParse,
} from "pdf-parse";

import type {
  Discovery,
  WorkspaceId,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../../repositories/discovery-repository";

import type {
  PageMetadata,
} from "../../types/page-metadata";

import {
  analyzeContent,
} from "../ai/openai-content-analyzer";

import {
  buildCurrentKnowledgeLibrary,
  saveDiscovery,
} from "../discoveries/discovery-service";

import {
  recordLearningCycle,
} from "../intelligence/personal-intelligence-service";

import {
  uploadDropboxAttachment,
} from "../cloud/dropbox-oauth-service";

import {
  extractImageKnowledge,
} from "./image-text-extractor";

const MAX_ANALYSIS_TEXT =
  16_000;

type ExtractedFileContent = {
  title: string;

  text: string;

  pageCount?: number;
};

export type FileCaptureInput = {
  saveWiseAccountId: string;

  workspaceId:
    WorkspaceId;

  file: {
    originalName: string;

    mimeType: string;

    sizeBytes: number;

    bytes: Buffer;
  };

  captureType:
    | "pdf"
    | "image";

  preferredLanguage:
    | "de"
    | "en"
    | "fr"
    | "it"
    | "es";

  preferredKnowledgePath?:
    string[];
};

export async function captureFile(
  repository:
    DiscoveryRepository,

  input:
    FileCaptureInput,
): Promise<{
  discovery: Discovery;

  knowledgeUpdate: {
    generatedAt: string;

    totalDiscoveries: number;

    totalTopics: number;

    totalInterests: number;

    totalRelations: number;
  };
}> {
  const attachmentId =
    randomUUID();

  const safeFileName =
    sanitizeFileName(
      input.file.originalName,
    );

  const storagePath =
    [
      "/SaveWise",
      input.workspaceId,
      input.captureType ===
        "pdf"
        ? "PDFs"
        : "Images",
      `${attachmentId}-${safeFileName}`,
    ].join("/");

  const extracted:
    ExtractedFileContent =
    input.captureType ===
      "pdf"
      ? await extractPdf(
          input.file.bytes,
          safeFileName,
        )
      : await extractImage(
          input.file.bytes,
          input.file.mimeType,
          safeFileName,
          input.preferredLanguage,
        );

  const metadata:
    PageMetadata = {
    url:
      `savewise-file://${attachmentId}/${encodeURIComponent(
        safeFileName,
      )}`,

    title:
      extracted.title,

    description:
      input.captureType ===
        "pdf"
        ? "Importiertes PDF-Dokument"
        : "Importiertes Bild",

    siteName:
      "SaveWise Capture",

    extractedText:
      extracted.text.slice(
        0,
        MAX_ANALYSIS_TEXT,
      ),

    contentType:
      input.captureType ===
        "pdf"
        ? "pdf"
        : "html",

    fetchStrategy:
      "standard",
  };

  const analysis =
    await analyzeContent(
      metadata,
      input.preferredLanguage,
    );

  const now =
    new Date().toISOString();

  const classification =
    applyPreferredKnowledgePath(
      analysis.classification,
      input.preferredKnowledgePath,
    );

  const discovery:
    Discovery = {
    id:
      randomUUID(),

    workspaceId:
      input.workspaceId,

    captureType:
      input.captureType,

    attachment: {
      id:
        attachmentId,

      captureType:
        input.captureType,

      fileName:
        safeFileName,

      mimeType:
        input.file.mimeType,

      sizeBytes:
        input.file.sizeBytes,

      storagePath,

      pageCount:
        extracted.pageCount,
    },

    source:
      "web",

    title:
      extracted.title,

    improvedTitle:
      analysis.improvedTitle,

    description:
      metadata.description,

    summary:
      analysis.summary,

    classification,

    keywords:
      analysis.keywords,

    language:
      analysis.language,

    confidence:
      analysis.confidence,

    topics: [
      classification.topic,
      ...classification.subtopics,
    ].filter(Boolean),

    createdAt:
      now,

    updatedAt:
      now,

    savedAtLabel:
      new Date().toLocaleString(
        "de-CH",
      ),
  };

  /*
   * Zuerst wird die Originaldatei
   * dauerhaft in Dropbox gesichert.
   */
  await uploadDropboxAttachment(
    input.saveWiseAccountId,
    {
      path:
        storagePath,

      bytes:
        input.file.bytes,
    },
  );

  const storedDiscovery =
    await saveDiscovery(
      repository,
      discovery,
    );

  const library =
    await buildCurrentKnowledgeLibrary(
      repository,
      input.workspaceId,
    );

  if (library.graph) {
    await recordLearningCycle(
      library.graph,
      "discovery-added",
      storedDiscovery.id,
    );
  }

  return {
    discovery:
      storedDiscovery,

    knowledgeUpdate: {
      generatedAt:
        library.generatedAt,

      totalDiscoveries:
        library.discoveries.length,

      totalTopics:
        library.topics.length,

      totalInterests:
        library.interests.length,

      totalRelations:
        library.relations.length,
    },
  };
}

async function extractPdf(
  bytes: Buffer,
  fileName: string,
): Promise<
  ExtractedFileContent
> {
  /*
   * Multer liefert einen Node-Buffer.
   * Uint8Array.from erstellt einen
   * eigenständigen, übertragbaren
   * Speicherbereich für den PDF-Worker.
   */
  const pdfData =
    Uint8Array.from(
      bytes,
    );

  const parser =
    new PDFParse({
      data:
        pdfData,
    });

  try {
    /*
     * Nicht parallel ausführen.
     * PDF.js kann denselben Datenpuffer
     * nicht gleichzeitig an mehrere
     * Worker-Aufrufe übertragen.
     */
    const textResult =
      await parser.getText();

    const normalizedText =
      normalizeText(
        textResult.text,
      ).slice(
        0,
        MAX_ANALYSIS_TEXT,
      );

    if (!normalizedText) {
      throw new Error(
        "PDF_HAS_NO_EXTRACTABLE_TEXT",
      );
    }

    let documentTitle:
      string | undefined;

    let pageCount:
      number | undefined;

    try {
      const infoResult =
        await parser.getInfo();

      documentTitle =
        infoResult.info?.Title
          ?.trim() ||
        undefined;

      pageCount =
        typeof infoResult.total ===
          "number"
          ? infoResult.total
          : undefined;
    } catch (
      infoError
    ) {
      /*
       * Metadaten sind optional.
       * Ein erfolgreich extrahierter
       * Text darf deshalb nicht wegen
       * fehlender PDF-Metadaten scheitern.
       */
      console.warn(
        "PDF metadata could not be read:",
        infoError,
      );
    }

    return {
      title:
        documentTitle ||
        fileName.replace(
          /\.pdf$/i,
          "",
        ),

      text:
        normalizedText,

      pageCount,
    };
  } finally {
    await parser.destroy();
  }
}

async function extractImage(
  bytes: Buffer,
  mimeType: string,
  fileName: string,
  preferredLanguage:
    FileCaptureInput[
      "preferredLanguage"
    ],
): Promise<
  ExtractedFileContent
> {
  const text =
    await extractImageKnowledge({
      bytes,

      mimeType,

      fileName,

      preferredLanguage,
    });

  return {
    title:
      fileName.replace(
        /\.(png|jpe?g|webp)$/i,
        "",
      ),

    text,
  };
}

function applyPreferredKnowledgePath(
  classification:
    NonNullable<
      Discovery[
        "classification"
      ]
    >,

  preferredPath:
    string[] | undefined,
): NonNullable<
  Discovery[
    "classification"
  ]
> {
  const normalized =
    preferredPath
      ?.map(
        (part) =>
          part.trim(),
      )
      .filter(Boolean)
      .slice(0, 3);

  if (!normalized?.length) {
    return classification;
  }

  return {
    ...classification,

    secondaryCategory:
      normalized[0] ??
      classification
        .secondaryCategory,

    topic:
      normalized[1] ??
      normalized[0] ??
      classification.topic,

    subtopics:
      normalized[2]
        ? [
            normalized[2],

            ...classification
              .subtopics
              .filter(
                (value) =>
                  value !==
                  normalized[2],
              ),
          ].slice(0, 6)
        : classification
            .subtopics,
  };
}

function sanitizeFileName(
  value: string,
): string {
  const cleaned =
    value
      .normalize("NFKC")
      .replace(
        /[^\p{L}\p{N}._ -]+/gu,
        "-",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim()
      .slice(0, 120);

  return (
    cleaned ||
    "savewise-file"
  );
}

function normalizeText(
  value: string,
): string {
  return value
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}
