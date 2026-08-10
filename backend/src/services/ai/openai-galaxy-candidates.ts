import OpenAI from "openai";
import { z } from "zod";
import {
  zodTextFormat,
} from "openai/helpers/zod";

import type {
  PageMetadata,
} from "../../types/page-metadata";

export type GalaxyCandidateSource = {
  galaxy: string;
  planets: string[];
};

export type GalaxyCandidate = {
  galaxy: string;
  score: number;
};

export type CanonicalGalaxyCandidateSource = {
  galaxy: string;
  planets: string[];
  sourceIndexes: number[];
};

const CandidateSchema =
  z.object({
    candidates:
      z.array(
        z.object({
          index:
            z.number()
              .int()
              .min(0)
              .max(99),

          score:
            z.number()
              .min(0)
              .max(1),
        }),
      )
        .max(5),
  });

const MODEL =
  "gpt-4.1-mini";


/*
 * ============================================================
 * TAXONOMY NORMALIZATION
 * ============================================================
 *
 * Diese Ebene behandelt nur offensichtliche
 * Schreibvarianten derselben Galaxie.
 *
 * Beispiele:
 *
 * Military Technology
 * military technology
 *
 * 3D Druck
 * 3D-Druck
 * 3D-Durck
 *
 * Semantische Synonyme wie:
 *
 * Paragliding
 * Gleitschirmfliegen
 *
 * werden hier bewusst NICHT automatisch
 * zusammengeführt.
 */

function normalizeGalaxyLabel(
  value: string,
): string {
  return value
    .normalize(
      "NFKC",
    )
    .toLocaleLowerCase()
    .replace(
      /[‐-‒–—−_-]+/g,
      " ",
    )
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function compactGalaxyLabel(
  value: string,
): string {
  return normalizeGalaxyLabel(
    value,
  ).replace(
    /\s+/g,
    "",
  );
}


/*
 * Erkennt maximal einen einfachen
 * Tippfehler:
 *
 * - 1 falscher Buchstabe
 * - 1 fehlender Buchstabe
 * - 1 zusätzlicher Buchstabe
 * - 2 vertauschte Nachbarbuchstaben
 */
function isSingleEditVariant(
  leftValue: string,
  rightValue: string,
): boolean {
  const left =
    compactGalaxyLabel(
      leftValue,
    );

  const right =
    compactGalaxyLabel(
      rightValue,
    );

  if (
    left === right
  ) {
    return true;
  }

  /*
   * Bei sehr kurzen Begriffen ist
   * Edit-Distance 1 zu aggressiv.
   */
  if (
    left.length < 5 ||
    right.length < 5
  ) {
    return false;
  }

  if (
    Math.abs(
      left.length -
      right.length,
    ) > 1
  ) {
    return false;
  }


  /*
   * Gleiche Länge:
   * ein falsches Zeichen oder
   * eine Nachbarvertauschung.
   */
  if (
    left.length ===
    right.length
  ) {
    const differences:
      number[] = [];

    for (
      let index = 0;
      index < left.length;
      index += 1
    ) {
      if (
        left[index] !==
        right[index]
      ) {
        differences.push(
          index,
        );

        if (
          differences.length >
          2
        ) {
          return false;
        }
      }
    }

    if (
      differences.length ===
      1
    ) {
      return true;
    }

    if (
      differences.length ===
      2
    ) {
      const first =
        differences[0];

      const second =
        differences[1];

      if (
        first === undefined ||
        second === undefined
      ) {
        return false;
      }

      return (
        second ===
          first + 1 &&
        left[first] ===
          right[second] &&
        left[second] ===
          right[first]
      );
    }

    return false;
  }


  /*
   * Unterschiedliche Länge:
   * genau ein Zeichen darf fehlen
   * oder zusätzlich sein.
   */
  const shorter =
    left.length <
    right.length
      ? left
      : right;

  const longer =
    left.length <
    right.length
      ? right
      : left;

  let shortIndex =
    0;

  let longIndex =
    0;

  let skipped =
    false;

  while (
    shortIndex <
      shorter.length &&
    longIndex <
      longer.length
  ) {
    if (
      shorter[shortIndex] ===
      longer[longIndex]
    ) {
      shortIndex +=
        1;

      longIndex +=
        1;

      continue;
    }

    if (
      skipped
    ) {
      return false;
    }

    skipped =
      true;

    longIndex +=
      1;
  }

  return true;
}


function areGalaxyLabelsEquivalent(
  left: string,
  right: string,
): boolean {
  const normalizedLeft =
    normalizeGalaxyLabel(
      left,
    );

  const normalizedRight =
    normalizeGalaxyLabel(
      right,
    );

  if (
    normalizedLeft ===
    normalizedRight
  ) {
    return true;
  }

  return isSingleEditVariant(
    left,
    right,
  );
}


/*
 * Die erste Variante bleibt der
 * kanonische Name.
 *
 * Da SaveWise die Galaxien vorher nach
 * Nutzungshäufigkeit sortiert, bleibt
 * normalerweise die etabliertere
 * Schreibweise erhalten.
 *
 * Planeten aller erkannten Dubletten
 * werden vereinigt.
 */
export function deduplicateGalaxySources(
  sources:
    GalaxyCandidateSource[],
): CanonicalGalaxyCandidateSource[] {
  const canonical:
    CanonicalGalaxyCandidateSource[] =
    [];

  for (
    let sourceIndex = 0;
    sourceIndex <
      sources.length;
    sourceIndex += 1
  ) {
    const source =
      sources[
        sourceIndex
      ];

    if (!source) {
      continue;
    }

    const existing =
      canonical.find(
        (candidate) =>
          areGalaxyLabelsEquivalent(
            candidate.galaxy,
            source.galaxy,
          ),
      );

    if (existing) {
      existing.sourceIndexes.push(
        sourceIndex,
      );

      for (
        const planet of
        source.planets
      ) {
        const planetExists =
          existing.planets.some(
            (
              existingPlanet,
            ) =>
              normalizeGalaxyLabel(
                existingPlanet,
              ) ===
              normalizeGalaxyLabel(
                planet,
              ),
          );

        if (
          !planetExists
        ) {
          existing.planets.push(
            planet,
          );
        }
      }

      continue;
    }

    canonical.push({
      galaxy:
        source.galaxy,

      planets: [
        ...source.planets,
      ],

      sourceIndexes: [
        sourceIndex,
      ],
    });
  }

  return canonical;
}


function createOpenAIClient():
OpenAI {
  const apiKey =
    process.env
      .OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured.",
    );
  }

  return new OpenAI({
    apiKey,

    timeout:
      30_000,

    maxRetries:
      1,
  });
}


export async function selectGalaxyCandidates(
  metadata:
    PageMetadata,

  existingKnowledgePaths:
    GalaxyCandidateSource[],
): Promise<
  GalaxyCandidate[]
> {
  if (
    existingKnowledgePaths.length ===
    0
  ) {
    return [];
  }

  /*
   * Zuerst offensichtliche Dubletten
   * entfernen.
   */
  const originalKnowledgePaths =
    existingKnowledgePaths
      .slice(
        0,
        50,
      );

  const canonicalKnowledgePaths =
    deduplicateGalaxySources(
      originalKnowledgePaths,
    );

  const galaxies =
    canonicalKnowledgePaths
      .map(
        (
          item,
          index,
        ) => ({
          index,

          label:
            item.galaxy,
        }),
      );

  const input =
    JSON.stringify({
      title:
        metadata.title,

      description:
        metadata.description ??
        undefined,

      extractedText:
        metadata.extractedText
          ?.slice(
            0,
            2_000,
          ) ??
        undefined,

      videoTranscript:
        metadata.videoTranscript
          ?.slice(
            0,
            2_000,
          ) ??
        undefined,

      galaxies,
    });

  const startedAt =
    Date.now();

  const openai =
    createOpenAIClient();

  const response =
    await openai.responses.parse({
      model:
        MODEL,

      instructions: [
        "You rank existing SaveWise Galaxies for a new piece of content.",
        "A Galaxy is a broad durable interest area, not a narrow single-document topic.",
        "Select at most five existing Galaxy indexes.",
        "Rank strongest semantic fit first.",
        "Treat translations and synonyms as equivalent meaning.",
        "Prefer an existing broad Galaxy over inventing a narrower category.",
        "Return no candidate if it is clearly unrelated.",
        "Use score 0..1 for semantic fit.",
        "Do not invent indexes.",
      ].join(
        "\n",
      ),

      input,

      text: {
        format:
          zodTextFormat(
            CandidateSchema,
            "savewise_galaxy_candidates",
          ),
      },
    });

  const durationMs =
    Date.now() -
    startedAt;

  const parsed =
    response.output_parsed;

  if (!parsed) {
    return [];
  }

  const used =
    new Set<
      number
    >();

  const candidates =
    parsed.candidates
      .filter(
        (candidate) =>
          candidate.index >=
            0 &&
          candidate.index <
            galaxies.length &&
          !used.has(
            candidate.index,
          ),
      )
      .map(
        (candidate) => {
          used.add(
            candidate.index,
          );

          return {
            galaxy:
              canonicalKnowledgePaths[
                candidate.index
              ]!.galaxy,

            score:
              candidate.score,
          };
        },
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.score -
          left.score,
      )
      .slice(
        0,
        5,
      );

  console.log(
    "[AI Galaxy Candidate Preview]",
    JSON.stringify({
      available:
        galaxies.length,

      originalAvailable:
        originalKnowledgePaths.length,

      duplicatesCollapsed:
        Math.max(
          0,
          originalKnowledgePaths.length -
            galaxies.length,
        ),

      candidates,

      durationMs,
    }),
  );

  return candidates;
}
