import type {
  Discovery,
  DiscoveryClassification,
  WorkspaceId,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../../repositories/discovery-repository";

type KnowledgePath = Pick<
  DiscoveryClassification,
  | "secondaryCategory"
  | "topic"
  | "subtopics"
>;

type PhaseTwoTaxonomyCorrection = {
  discoveryId: string;
  exactTitle: string;
  expectedPath: KnowledgePath;
  correctedPath: KnowledgePath;
};

export type PhaseTwoTaxonomyCorrectionPreview = {
  discoveryId: string;
  title: string;
  oldPath: KnowledgePath;
  newPath: KnowledgePath;
};

export type PhaseTwoTaxonomyMigrationResult = {
  workspaceId: WorkspaceId;
  changed: number;
  alreadyCorrect: number;
  conflicts: number;
  conflictDetails: Array<{
    discoveryId: string;
    reason:
      | "missing"
      | "workspace-mismatch"
      | "title-mismatch"
      | "source-path-mismatch";
  }>;
};

/*
 * Separately reviewed phase-two corrections for the private Railway
 * library on 2026-08-10. Only high-confidence cases are included.
 * Matching requires both the exact immutable ID and exact reviewed
 * title; this catalogue contains no fuzzy or general rules.
 */
export const EXPLICIT_TAXONOMY_CORRECTIONS_PHASE_TWO:
  readonly PhaseTwoTaxonomyCorrection[] = [
  /* Solo hiking and bivouacking in the Alps is explicitly outdoor content. */
  {
    discoveryId: "9dab8ff7-26e4-4f3e-b7c3-f64fbe5d7f1a",
    exactTitle: "Solo Biwak in den Schweizer Alpen: Freiheit und Natur pur",
    expectedPath: {
      secondaryCategory: "Fitness and Sports",
      topic: "Freizeit",
      subtopics: ["Outdoor Aktivitäten", "Wandern", "Biwak", "Alpen"],
    },
    correctedPath: {
      secondaryCategory: "Outdoor & Abenteuer",
      topic: "Outdoor & Abenteuer",
      subtopics: ["Outdoor Aktivitäten", "Wandern", "Biwak", "Alpen"],
    },
  },

  /* A hotel confirmation is accommodation, not a mysterious place. */
  {
    discoveryId: "192f2f3d-8640-440f-bfcb-23d4ba23daf4",
    exactTitle: "Reservierungsbestätigung für Hotelaufenthalt in Thun im Juli 2026",
    expectedPath: {
      secondaryCategory: "Reisen & Entdeckung",
      topic: "Geheimnisvolle Orte",
      subtopics: ["Reservierungen", "Hotelaufenthalt", "Schweiz", "Thun"],
    },
    correctedPath: {
      secondaryCategory: "Reisen & Entdeckung",
      topic: "Unterkunft & Reservierungen",
      subtopics: ["Reservierungen", "Hotelaufenthalt", "Schweiz", "Thun"],
    },
  },

  /* Metadata identifies only a generic TikTok post, with no health content. */
  {
    discoveryId: "e8ff47f6-ba8e-4024-a739-df626ca4d489",
    exactTitle: "TikTok Beitrag von @lucyyyhf: Kurzvideo auf TikTok",
    expectedPath: {
      secondaryCategory: "Health and Nutrition",
      topic: "Soziale Medien",
      subtopics: ["TikTok", "Kurzvideos"],
    },
    correctedPath: {
      secondaryCategory: "Social Media",
      topic: "TikTok",
      subtopics: ["TikTok", "Kurzvideos"],
    },
  },

  /* The study is vehicle-safety engineering, matching the existing protection systems area. */
  {
    discoveryId: "96d3c982-cb23-4a6c-a014-24b2c99e09e4",
    exactTitle: "Bewertung von Kopfverletzungen bei Fahrzeuginsassen während Innenraumeinwirkungen gemäß FMVSS 201U mittels Finite-Elemem",
    expectedPath: {
      secondaryCategory: "Industry and Business",
      topic: "Automobiltechnik",
      subtopics: [
        "Fahrzeugsicherheit",
        "Finite-Elemente-Methode",
        "Kopfverletzungsbewertung",
        "Materialauswahl",
      ],
    },
    correctedPath: {
      secondaryCategory: "Security Technologies",
      topic: "Sicherheits- und Schutzsysteme",
      subtopics: [
        "Fahrzeugsicherheit",
        "Finite-Elemente-Methode",
        "Kopfverletzungsbewertung",
        "Materialauswahl",
      ],
    },
  },
] as const;

/**
 * Strict read-only preview. It performs no mutation and has no
 * repository, persistence, rebuild, organizer or AI dependency.
 */
export function previewPhaseTwoTaxonomyCorrections(
  discoveries: Discovery[],
): PhaseTwoTaxonomyCorrectionPreview[] {
  const discoveriesById =
    new Map(
      discoveries.map((discovery) => [
        discovery.id,
        discovery,
      ]),
    );

  return EXPLICIT_TAXONOMY_CORRECTIONS_PHASE_TWO.map(
    (correction) => {
      const discovery =
        discoveriesById.get(
          correction.discoveryId,
        );

      if (!discovery) {
        throw new Error(
          `Phase-two taxonomy correction target not found: ${correction.discoveryId}.`,
        );
      }

      const title =
        discovery.improvedTitle ||
        discovery.title;

      if (title !== correction.exactTitle) {
        throw new Error(
          `Exact title mismatch for ${correction.discoveryId}.`,
        );
      }

      const classification =
        discovery.classification;

      if (
        !classification ||
        !pathsEqual(
          classification,
          correction.expectedPath,
        )
      ) {
        throw new Error(
          `Exact source path mismatch for ${correction.discoveryId}.`,
        );
      }

      return {
        discoveryId:
          discovery.id,
        title,
        oldPath: {
          secondaryCategory:
            classification.secondaryCategory,
          topic:
            classification.topic,
          subtopics: [
            ...classification.subtopics,
          ],
        },
        newPath: {
          secondaryCategory:
            correction.correctedPath.secondaryCategory,
          topic:
            correction.correctedPath.topic,
          subtopics: [
            ...correction.correctedPath.subtopics,
          ],
        },
      };
    },
  );
}

/**
 * Applies phase two atomically through the normal Discovery repository.
 * All four targets are validated before a corrected collection is
 * constructed. This function deliberately does not rebuild the graph or
 * invoke the organizer or any AI service.
 */
export async function migrateExplicitTaxonomyCorrectionsPhaseTwo(
  repository: DiscoveryRepository,
  workspaceId: WorkspaceId = "private",
): Promise<PhaseTwoTaxonomyMigrationResult> {
  const discoveries =
    await repository.getAll();

  const discoveryIndexes =
    new Map(
      discoveries.map((discovery, index) => [
        discovery.id,
        index,
      ]),
    );

  let alreadyCorrect = 0;

  const conflictDetails:
    PhaseTwoTaxonomyMigrationResult["conflictDetails"] = [];

  const pendingCorrections: Array<{
    discoveryIndex: number;
    correction: PhaseTwoTaxonomyCorrection;
  }> = [];

  for (const correction of EXPLICIT_TAXONOMY_CORRECTIONS_PHASE_TWO) {
    const discoveryIndex =
      discoveryIndexes.get(
        correction.discoveryId,
      );

    if (discoveryIndex === undefined) {
      conflictDetails.push({
        discoveryId:
          correction.discoveryId,
        reason:
          "missing",
      });
      continue;
    }

    const discovery =
      discoveries[discoveryIndex];

    if (
      (discovery.workspaceId ?? "private") !==
      workspaceId
    ) {
      conflictDetails.push({
        discoveryId:
          correction.discoveryId,
        reason:
          "workspace-mismatch",
      });
      continue;
    }

    const title =
      discovery.improvedTitle ||
      discovery.title;

    if (title !== correction.exactTitle) {
      conflictDetails.push({
        discoveryId:
          correction.discoveryId,
        reason:
          "title-mismatch",
      });
      continue;
    }

    const classification =
      discovery.classification;

    if (
      classification &&
      pathsEqual(
        classification,
        correction.correctedPath,
      )
    ) {
      alreadyCorrect += 1;
      continue;
    }

    if (
      !classification ||
      !pathsEqual(
        classification,
        correction.expectedPath,
      )
    ) {
      conflictDetails.push({
        discoveryId:
          correction.discoveryId,
        reason:
          "source-path-mismatch",
      });
      continue;
    }

    pendingCorrections.push({
      discoveryIndex,
      correction,
    });
  }

  for (const conflict of conflictDetails) {
    console.warn(
      "[Explicit Taxonomy Migration Phase 2] conflict",
      JSON.stringify({
        workspaceId,
        ...conflict,
      }),
    );
  }

  if (conflictDetails.length > 0) {
    const result: PhaseTwoTaxonomyMigrationResult = {
      workspaceId,
      changed: 0,
      alreadyCorrect,
      conflicts:
        conflictDetails.length,
      conflictDetails,
    };

    logMigrationResult(result);
    return result;
  }

  const nextDiscoveries =
    [...discoveries];

  for (
    const {
      discoveryIndex,
      correction,
    }
    of pendingCorrections
  ) {
    const discovery =
      discoveries[discoveryIndex];

    const classification =
      discovery.classification;

    if (!classification) {
      throw new Error(
        `Validated discovery ${discovery.id} unexpectedly has no classification.`,
      );
    }

    nextDiscoveries[discoveryIndex] = {
      ...discovery,
      classification: {
        ...classification,
        secondaryCategory:
          correction.correctedPath.secondaryCategory,
        topic:
          correction.correctedPath.topic,
        subtopics: [
          ...correction.correctedPath.subtopics,
        ],
      },
      topics: [
        correction.correctedPath.topic,
        ...correction.correctedPath.subtopics,
      ],
      updatedAt:
        new Date().toISOString(),
    };
  }

  if (pendingCorrections.length > 0) {
    await repository.saveAll(
      nextDiscoveries,
    );
  }

  const result: PhaseTwoTaxonomyMigrationResult = {
    workspaceId,
    changed:
      pendingCorrections.length,
    alreadyCorrect,
    conflicts: 0,
    conflictDetails: [],
  };

  logMigrationResult(result);
  return result;
}

function logMigrationResult(
  result: PhaseTwoTaxonomyMigrationResult,
): void {
  console.log(
    "[Explicit Taxonomy Migration Phase 2]",
    JSON.stringify({
      workspaceId:
        result.workspaceId,
      changed:
        result.changed,
      alreadyCorrect:
        result.alreadyCorrect,
      conflicts:
        result.conflicts,
    }),
  );
}

function pathsEqual(
  actual: KnowledgePath,
  expected: KnowledgePath,
): boolean {
  return (
    actual.secondaryCategory ===
      expected.secondaryCategory &&
    actual.topic ===
      expected.topic &&
    actual.subtopics.length ===
      expected.subtopics.length &&
    actual.subtopics.every(
      (subtopic, index) =>
        subtopic ===
        expected.subtopics[index],
    )
  );
}
