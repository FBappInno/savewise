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

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,

    timeout:
      30_000,

    maxRetries:
      1,
  });

const MODEL =
  "gpt-4.1-mini";

export async function selectGalaxyCandidates(
  metadata: PageMetadata,
  existingKnowledgePaths:
    GalaxyCandidateSource[],
): Promise<GalaxyCandidate[]> {
  if (
    existingKnowledgePaths.length ===
    0
  ) {
    return [];
  }

  if (
    !process.env.OPENAI_API_KEY
  ) {
    throw new Error(
      "OPENAI_API_KEY is not configured.",
    );
  }

  const galaxies =
    existingKnowledgePaths
      .slice(0, 50)
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
    new Set<number>();

  const candidates =
    parsed.candidates
      .filter(
        (candidate) =>
          candidate.index >= 0 &&
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
              existingKnowledgePaths[
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

      candidates,

      durationMs,
    }),
  );

  return candidates;
}
