import {
  randomUUID,
} from "node:crypto";

import {
  extractText,
  getDocumentProxy,
  getMeta,
} from "unpdf";

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
  type ExistingKnowledgePath,
} from "../ai/openai-content-analyzer";


import {
  selectGalaxyCandidates,
} from "../ai/openai-galaxy-candidates";

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

const MAX_PDF_PAGES =
  150;

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

export async function previewFileGalaxyCandidates(
  repository:
    DiscoveryRepository,

  input: {
    workspaceId:
      WorkspaceId;

    captureType:
      | "pdf"
      | "image";

    preferredLanguage:
      | "de"
      | "en"
      | "fr"
      | "it"
      | "es";

    file: {
      originalName:
        string;

      mimeType:
        string;

      sizeBytes:
        number;

      bytes:
        Buffer;
    };
  },
): Promise<
  {
    galaxy: string;
    score: number;
  }[]
> {
  const safeFileName =
    sanitizeFileName(
      input.file.originalName,
    );

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
      `savewise-preview://${encodeURIComponent(
        safeFileName,
      )}`,

    title:
      extracted.title,

    description:
      input.captureType ===
        "pdf"
        ? "PDF-Vorschau für SaveWise Classification V3"
        : "Bild-Vorschau für SaveWise Classification V3",

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

  const library =
    await buildCurrentKnowledgeLibrary(
      repository,
      input.workspaceId,
    );

  const galaxyMap =
    new Map<
      string,
      {
        count: number;
        planets:
          Map<
            string,
            number
          >;
      }
    >();

  for (
    const discovery of
    library.discoveries
  ) {
    const classification =
      discovery.classification;

    if (!classification) {
      continue;
    }

    const galaxy =
      classification
        .secondaryCategory
        ?.trim();

    const planet =
      classification
        .topic
        ?.trim();

    if (!galaxy) {
      continue;
    }

    const current =
      galaxyMap.get(
        galaxy,
      ) ?? {
        count:
          0,

        planets:
          new Map<
            string,
            number
          >(),
      };

    current.count +=
      1;

    if (planet) {
      current.planets.set(
        planet,
        (
          current.planets.get(
            planet,
          ) ??
          0
        ) + 1,
      );
    }

    galaxyMap.set(
      galaxy,
      current,
    );
  }

  const existingKnowledgePaths =
    [
      ...galaxyMap.entries(),
    ]
      .sort(
        (
          [, left],
          [, right],
        ) =>
          right.count -
          left.count,
      )
      .slice(
        0,
        50,
      )
      .map(
        ([
          galaxy,
          data,
        ]) => ({
          galaxy,

          planets:
            [
              ...data.planets
                .entries(),
            ]
              .sort(
                (
                  [, left],
                  [, right],
                ) =>
                  right -
                  left,
              )
              .slice(
                0,
                8,
              )
              .map(
                ([planet]) =>
                  planet,
              ),
        }),
      );

  const candidates =
    await selectGalaxyCandidates(
      metadata,
      existingKnowledgePaths,
    );

  console.log(
    "[AI File Galaxy Candidates]",
    JSON.stringify({
      captureType:
        input.captureType,

      available:
        existingKnowledgePaths.length,

      candidates,
    }),
  );

  return candidates;
}


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

  /*
   * CLASSIFICATION V3 / V3B
   *
   * Auch Dateiimporte verwenden ab hier
   * dieselbe bestehende Taxonomie wie der
   * Link-Import.
   *
   * Galaxy  = secondaryCategory
   * Planet  = topic
   */
  const existingLibrary =
    await buildCurrentKnowledgeLibrary(
      repository,
      input.workspaceId,
    );

  const galaxyMap =
    new Map<
      string,
      {
        count: number;
        planets:
          Map<
            string,
            number
          >;
      }
    >();

  for (
    const discovery of
    existingLibrary.discoveries
  ) {
    const classification =
      discovery.classification;

    if (!classification) {
      continue;
    }

    const galaxy =
      classification
        .secondaryCategory
        ?.trim();

    const planet =
      classification
        .topic
        ?.trim();

    if (!galaxy) {
      continue;
    }

    const existing =
      galaxyMap.get(
        galaxy,
      ) ?? {
        count: 0,

        planets:
          new Map<
            string,
            number
          >(),
      };

    existing.count += 1;

    if (planet) {
      existing.planets.set(
        planet,
        (
          existing.planets.get(
            planet,
          ) ??
          0
        ) + 1,
      );
    }

    galaxyMap.set(
      galaxy,
      existing,
    );
  }

  const existingKnowledgePaths:
    ExistingKnowledgePath[] =
    [
      ...galaxyMap.entries(),
    ]
      .sort(
        (
          [, left],
          [, right],
        ) =>
          right.count -
          left.count,
      )
      .slice(
        0,
        50,
      )
      .map(
        ([
          galaxy,
          data,
        ]) => ({
          galaxy,

          planets:
            [
              ...data.planets
                .entries(),
            ]
              .sort(
                (
                  [, left],
                  [, right],
                ) =>
                  right -
                  left,
              )
              .slice(
                0,
                8,
              )
              .map(
                ([planet]) =>
                  planet,
              ),
        }),
      );

  const preferredGalaxy =
    input.preferredKnowledgePath
      ?.[0]
      ?.trim();

  /*
   * Wurde eine bestehende Galaxie
   * ausgewählt, sieht V3B nur diese
   * eine Galaxie und deren Planeten.
   */
  const effectiveKnowledgePaths =
    preferredGalaxy
      ? existingKnowledgePaths
          .filter(
            (path) =>
              path.galaxy
                .toLocaleLowerCase() ===
              preferredGalaxy
                .toLocaleLowerCase(),
          )
      : existingKnowledgePaths;

  const lockedGalaxy =
    preferredGalaxy
      ? effectiveKnowledgePaths[0]
          ?.galaxy
      : undefined;

  const analysis =
    await analyzeContent(
      metadata,
      input.preferredLanguage,
      effectiveKnowledgePaths,
    );

  const now =
    new Date().toISOString();

  const classification =
    applyPreferredKnowledgePath(
      {
        ...analysis.classification,

        /*
         * V3B Galaxy Lock:
         * Eine ausgewählte bestehende
         * Galaxie kann von der KI nicht
         * überschrieben werden.
         */
        secondaryCategory:
          lockedGalaxy ??
          analysis.classification
            .secondaryCategory,
      },

      input.preferredKnowledgePath,
    );

  if (lockedGalaxy) {
    console.log(
      "[Classification V3B File]",
      JSON.stringify({
        captureType:
          input.captureType,

        galaxy:
          lockedGalaxy,

        planet:
          classification.topic,

        availablePlanets:
          effectiveKnowledgePaths[0]
            ?.planets
            .length ??
          0,
      }),
    );
  }

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
   * Originaldatei zuerst dauerhaft
   * in Dropbox sichern. Dadurch wird
   * keine unvollständige Discovery
   * gespeichert.
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
   * Einen eigenständigen Uint8Array
   * erzeugen. Dadurch verwenden wir
   * nicht den möglicherweise größeren
   * zugrunde liegenden Buffer von Multer.
   */
  const data =
    Uint8Array.from(
      bytes,
    );

  const document =
    await getDocumentProxy(
      data,
      {
        maxImageSize:
          16_777_216,
      },
    );

  if (
    document.numPages >
    MAX_PDF_PAGES
  ) {
    throw new Error(
      "PDF_PAGE_LIMIT_EXCEEDED",
    );
  }

  const textResult =
    await extractText(
      document,
      {
        mergePages:
          true,
      },
    );

  /*
   * Bei mergePages=true liefert
   * unpdf bereits einen String.
   */
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

  let title:
    string | undefined;

  try {
    const metadata =
      await getMeta(
        document,
      );

    const metadataTitle =
      metadata.info?.Title;

    title =
      typeof metadataTitle ===
        "string"
        ? metadataTitle.trim()
        : undefined;
  } catch (
    metadataError
  ) {
    /*
     * Metadaten sind optional.
     * Der Textimport darf deswegen
     * nicht fehlschlagen.
     */
    console.warn(
      "PDF metadata could not be read:",
      metadataError,
    );
  }

  return {
    title:
      title ||
      fileName.replace(
        /\.pdf$/i,
        "",
      ),

    text:
      normalizedText,

    pageCount:
      textResult.totalPages,
  };
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
      /\r\n/g,
      "\n",
    )
    .replace(
      /[ \t]+/g,
      " ",
    )
    .replace(
      /\n{3,}/g,
      "\n\n",
    )
    .trim();
}
