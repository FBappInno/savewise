import type {
  Discovery,
  WorkspaceId,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../../repositories/discovery-repository";

type MergeRule = {
  action: "merge";
  sourceGalaxy: string;
  targetGalaxy: string;
  expectedCount: number;
  consolidatedTopic: string;
};

type GroupRule = {
  action: "group";
  sourceGalaxy: string;
  targetGalaxy: string;
  expectedCount: number;
};

type ConsolidationRule =
  | MergeRule
  | GroupRule;

export type GalaxyConsolidationPath = {
  secondaryCategory: string;
  topic: string;
  subtopics: string[];
};

export type GalaxyConsolidationPreview = {
  discoveryId: string;
  oldPath: GalaxyConsolidationPath;
  newPath: GalaxyConsolidationPath;
};

export type GalaxyConsolidationResult = {
  workspaceId: WorkspaceId;
  changed: number;
  alreadyCorrect: number;
  conflicts: number;
  conflictDetails: Array<{
    sourceGalaxy: string;
    targetGalaxy: string;
    sourceCount: number;
    consolidatedCount: number;
    reason:
      | "unexpected-source-count"
      | "mixed-state"
      | "unexpected-group-target-content";
  }>;
  preview: GalaxyConsolidationPreview[];
};

/*
 * Exact, one-time decisions reviewed against the private Railway
 * library after taxonomy migration phases 1 and 2. Counts are part of
 * the fail-closed production guard: a changed source set is a conflict.
 */
export const EXPLICIT_GALAXY_CONSOLIDATION_RULES:
  readonly ConsolidationRule[] = [
  {
    action: "merge",
    sourceGalaxy:
      "Travel and Exploration",
    targetGalaxy:
      "Reisen & Entdeckung",
    expectedCount: 1,
    consolidatedTopic:
      "Tourismus in den Alpen",
  },
  {
    action: "group",
    sourceGalaxy:
      "Military Technology",
    targetGalaxy:
      "Sicherheits- und Verteidigungstechnologie",
    expectedCount: 8,
  },
  {
    action: "group",
    sourceGalaxy:
      "Security Technologies",
    targetGalaxy:
      "Sicherheits- und Verteidigungstechnologie",
    expectedCount: 6,
  },
  {
    action: "group",
    sourceGalaxy:
      "History and Secret Societies",
    targetGalaxy:
      "Geschichte & Archäologie",
    expectedCount: 6,
  },
  {
    action: "group",
    sourceGalaxy:
      "Archäologie",
    targetGalaxy:
      "Geschichte & Archäologie",
    expectedCount: 2,
  },
  {
    action: "group",
    sourceGalaxy:
      "Fitness and Sports",
    targetGalaxy:
      "Sport & Outdoor",
    expectedCount: 4,
  },
  {
    action: "group",
    sourceGalaxy:
      "Outdoor & Abenteuer",
    targetGalaxy:
      "Sport & Outdoor",
    expectedCount: 5,
  },
] as const;

/**
 * Atomically applies the exact consolidation. It has no rebuild,
 * organizer or AI dependency. All rules are validated before any new
 * Discovery object is constructed or passed to the repository.
 */
export async function migrateExplicitGalaxyConsolidation(
  repository: DiscoveryRepository,
  workspaceId: WorkspaceId = "private",
): Promise<GalaxyConsolidationResult> {
  const discoveries =
    await repository.getAll();

  const workspaceDiscoveries =
    discoveries.filter(
      (discovery) =>
        (discovery.workspaceId ?? "private") ===
        workspaceId,
    );

  const conflictDetails:
    GalaxyConsolidationResult["conflictDetails"] = [];

  let alreadyCorrect = 0;

  const pendingRules:
    ConsolidationRule[] = [];

  for (const rule of EXPLICIT_GALAXY_CONSOLIDATION_RULES) {
    const sourceDiscoveries =
      workspaceDiscoveries.filter(
        (discovery) =>
          discovery.classification
            ?.secondaryCategory ===
          rule.sourceGalaxy,
      );

    const consolidatedDiscoveries =
      workspaceDiscoveries.filter(
        (discovery) =>
          isConsolidatedDiscovery(
            discovery,
            rule,
          ),
      );

    if (
      sourceDiscoveries.length ===
        rule.expectedCount &&
      consolidatedDiscoveries.length === 0
    ) {
      pendingRules.push(rule);
      continue;
    }

    if (
      sourceDiscoveries.length === 0 &&
      consolidatedDiscoveries.length ===
        rule.expectedCount
    ) {
      alreadyCorrect +=
        rule.expectedCount;
      continue;
    }

    conflictDetails.push({
      sourceGalaxy:
        rule.sourceGalaxy,
      targetGalaxy:
        rule.targetGalaxy,
      sourceCount:
        sourceDiscoveries.length,
      consolidatedCount:
        consolidatedDiscoveries.length,
      reason:
        sourceDiscoveries.length > 0 &&
        consolidatedDiscoveries.length > 0
          ? "mixed-state"
          : "unexpected-source-count",
    });
  }

  for (const targetGalaxy of groupTargetGalaxies()) {
    const expectedConsolidatedCount =
      EXPLICIT_GALAXY_CONSOLIDATION_RULES
        .filter(
          (rule): rule is GroupRule =>
            rule.action === "group" &&
            rule.targetGalaxy ===
              targetGalaxy,
        )
        .reduce(
          (total, rule) =>
            total + rule.expectedCount,
          0,
        );

    const actualTargetCount =
      workspaceDiscoveries.filter(
        (discovery) =>
          discovery.classification
            ?.secondaryCategory ===
          targetGalaxy,
      ).length;

    const recognizedTargetCount =
      EXPLICIT_GALAXY_CONSOLIDATION_RULES
        .filter(
          (rule): rule is GroupRule =>
            rule.action === "group" &&
            rule.targetGalaxy ===
              targetGalaxy,
        )
        .reduce(
          (total, rule) =>
            total +
            workspaceDiscoveries.filter(
              (discovery) =>
                isConsolidatedDiscovery(
                  discovery,
                  rule,
                ),
            ).length,
          0,
        );

    if (
      actualTargetCount !== 0 &&
      (
        actualTargetCount !==
          expectedConsolidatedCount ||
        recognizedTargetCount !==
          expectedConsolidatedCount
      )
    ) {
      conflictDetails.push({
        sourceGalaxy:
          "<group-target>",
        targetGalaxy,
        sourceCount: 0,
        consolidatedCount:
          actualTargetCount,
        reason:
          "unexpected-group-target-content",
      });
    }
  }

  if (conflictDetails.length > 0) {
    const result: GalaxyConsolidationResult = {
      workspaceId,
      changed: 0,
      alreadyCorrect,
      conflicts:
        conflictDetails.length,
      conflictDetails,
      preview: [],
    };

    logResult(result);
    return result;
  }

  const pendingBySource =
    new Map(
      pendingRules.map((rule) => [
        rule.sourceGalaxy,
        rule,
      ]),
    );

  const preview:
    GalaxyConsolidationPreview[] = [];

  const nextDiscoveries =
    discoveries.map((discovery) => {
      if (
        (discovery.workspaceId ?? "private") !==
        workspaceId ||
        !discovery.classification
      ) {
        return discovery;
      }

      const rule =
        pendingBySource.get(
          discovery.classification.secondaryCategory,
        );

      if (!rule) {
        return discovery;
      }

      const oldPath =
        pathOf(discovery);

      const newPath =
        createConsolidatedPath(
          oldPath,
          rule,
        );

      preview.push({
        discoveryId:
          discovery.id,
        oldPath,
        newPath,
      });

      return {
        ...discovery,
        classification: {
          ...discovery.classification,
          ...newPath,
        },
        topics: [
          newPath.topic,
          ...newPath.subtopics,
        ],
        updatedAt:
          new Date().toISOString(),
      };
    });

  for (const entry of preview) {
    console.log(
      "[Explicit Galaxy Consolidation] dry-run",
      JSON.stringify(entry),
    );
  }

  if (preview.length > 0) {
    await repository.saveAll(
      nextDiscoveries,
    );
  }

  const result: GalaxyConsolidationResult = {
    workspaceId,
    changed:
      preview.length,
    alreadyCorrect,
    conflicts: 0,
    conflictDetails: [],
    preview,
  };

  logResult(result);
  return result;
}

function createConsolidatedPath(
  oldPath: GalaxyConsolidationPath,
  rule: ConsolidationRule,
): GalaxyConsolidationPath {
  if (rule.action === "merge") {
    return {
      ...oldPath,
      secondaryCategory:
        rule.targetGalaxy,
    };
  }

  return {
    secondaryCategory:
      rule.targetGalaxy,
    topic:
      rule.sourceGalaxy,
    subtopics:
      uniqueExactStrings([
        oldPath.topic,
        ...oldPath.subtopics,
      ]),
  };
}

function isConsolidatedDiscovery(
  discovery: Discovery,
  rule: ConsolidationRule,
): boolean {
  const classification =
    discovery.classification;

  if (
    !classification ||
    classification.secondaryCategory !==
      rule.targetGalaxy
  ) {
    return false;
  }

  return rule.action === "group"
    ? classification.topic ===
        rule.sourceGalaxy
    : classification.topic ===
        rule.consolidatedTopic;
}

function pathOf(
  discovery: Discovery,
): GalaxyConsolidationPath {
  const classification =
    discovery.classification;

  if (!classification) {
    throw new Error(
      `Discovery ${discovery.id} has no classification.`,
    );
  }

  return {
    secondaryCategory:
      classification.secondaryCategory,
    topic:
      classification.topic,
    subtopics: [
      ...classification.subtopics,
    ],
  };
}

function uniqueExactStrings(
  values: string[],
): string[] {
  return [...new Set(
    values.filter(
      (value) =>
        value.length > 0,
    ),
  )];
}

function groupTargetGalaxies(): string[] {
  return [...new Set(
    EXPLICIT_GALAXY_CONSOLIDATION_RULES
      .filter(
        (rule) =>
          rule.action === "group",
      )
      .map((rule) =>
        rule.targetGalaxy,
      ),
  )];
}

function logResult(
  result: GalaxyConsolidationResult,
): void {
  for (const conflict of result.conflictDetails) {
    console.warn(
      "[Explicit Galaxy Consolidation] conflict",
      JSON.stringify({
        workspaceId:
          result.workspaceId,
        ...conflict,
      }),
    );
  }

  console.log(
    "[Explicit Galaxy Consolidation]",
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
