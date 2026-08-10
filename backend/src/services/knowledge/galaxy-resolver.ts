import type {
  PageMetadata,
} from "../../types/page-metadata";

import type {
  ExistingKnowledgePath,
} from "../ai/openai-content-analyzer";

import {
  selectGalaxyCandidates,
} from "../ai/openai-galaxy-candidates";

const DEFAULT_REUSE_MIN_SCORE =
  0.72;

export type GalaxyResolution = {
  galaxyLock:
    string | undefined;

  knowledgePaths:
    ExistingKnowledgePath[];

  preferredKnowledgePath:
    string[] | undefined;

  source:
    | "user"
    | "candidate"
    | "unresolved";

  score:
    number | undefined;
};

export async function resolveImportGalaxy(
  input: {
    metadata:
      PageMetadata;

    existingKnowledgePaths:
      ExistingKnowledgePath[];

    preferredKnowledgePath?:
      string[];
  },
): Promise<GalaxyResolution> {
  const preferredKnowledgePath =
    normalizeKnowledgePath(
      input.preferredKnowledgePath,
    );

  const requestedGalaxy =
    preferredKnowledgePath
      ?.[0];

  if (requestedGalaxy) {
    const existing =
      findGalaxy(
        input.existingKnowledgePaths,
        requestedGalaxy,
      );

    const galaxyLock =
      existing?.galaxy ??
      requestedGalaxy;

    return {
      galaxyLock,

      knowledgePaths:
        existing
          ? [existing]
          : [],

      preferredKnowledgePath: [
        galaxyLock,
        ...(
          preferredKnowledgePath
            ?.slice(1) ??
          []
        ),
      ],

      source: "user",
      score: undefined,
    };
  }

  if (
    input.existingKnowledgePaths
      .length === 0
  ) {
    return unresolvedResolution(
      input.existingKnowledgePaths,
    );
  }

  try {
    const candidates =
      await selectGalaxyCandidates(
        input.metadata,
        input.existingKnowledgePaths,
      );

    const bestCandidate =
      candidates[0];

    if (
      bestCandidate &&
      bestCandidate.score >=
        getReuseMinScore()
    ) {
      const existing =
        findGalaxy(
          input.existingKnowledgePaths,
          bestCandidate.galaxy,
        );

      if (existing) {
        return {
          galaxyLock:
            existing.galaxy,

          knowledgePaths: [
            existing,
          ],

          preferredKnowledgePath: [
            existing.galaxy,
          ],

          source:
            "candidate",

          score:
            bestCandidate.score,
        };
      }
    }
  } catch (error) {
    /*
     * Ein Ausfall der zusätzlichen
     * Kandidatenprüfung darf den Import
     * nicht blockieren. Die bestehende
     * V3-Klassifikation entscheidet dann
     * anhand aller bekannten Galaxien.
     */
    console.error(
      "[Galaxy Resolver] candidate selection failed:",
      error,
    );
  }

  return unresolvedResolution(
    input.existingKnowledgePaths,
  );
}

function unresolvedResolution(
  knowledgePaths:
    ExistingKnowledgePath[],
): GalaxyResolution {
  return {
    galaxyLock: undefined,
    knowledgePaths,
    preferredKnowledgePath:
      undefined,
    source: "unresolved",
    score: undefined,
  };
}

function findGalaxy(
  knowledgePaths:
    ExistingKnowledgePath[],
  galaxy: string,
): ExistingKnowledgePath | undefined {
  const key =
    normalizeGalaxyKey(
      galaxy,
    );

  return knowledgePaths.find(
    (path) =>
      normalizeGalaxyKey(
        path.galaxy,
      ) === key,
  );
}

function normalizeKnowledgePath(
  path:
    string[] | undefined,
): string[] | undefined {
  const normalized =
    path
      ?.map(
        (part) =>
          part.trim(),
      )
      .filter(Boolean)
      .slice(0, 3) ??
    [];

  return normalized.length > 0
    ? normalized
    : undefined;
}

function normalizeGalaxyKey(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function getReuseMinScore():
number {
  const configured =
    Number(
      process.env
        .GALAXY_REUSE_MIN_SCORE,
    );

  if (
    !Number.isFinite(
      configured,
    )
  ) {
    return DEFAULT_REUSE_MIN_SCORE;
  }

  return Math.min(
    1,
    Math.max(
      0,
      configured,
    ),
  );
}
