import type {
  Discovery,
  WorkspaceId,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../../repositories/discovery-repository";

import type {
  GalaxyAssignment,
} from "../ai/openai-galaxy-organizer";

export type GalaxyOrganizationApplyResult = {
  changedDiscoveries: number;

  mergedGalaxies: number;

  groupedGalaxies: number;

  changes: Array<{
    sourceGalaxy: string;
    canonicalGalaxy: string;
    action:
      | "merge"
      | "group";
  }>;
};

export async function applyGalaxyOrganization(
  repository:
    DiscoveryRepository,
  workspaceId:
    WorkspaceId,
  assignments:
    GalaxyAssignment[],
): Promise<GalaxyOrganizationApplyResult> {
  const discoveries =
    await repository.getAll();

  const assignmentMap =
    new Map(
      assignments.map(
        (assignment) => [
          normalizeKey(
            assignment.sourceGalaxy,
          ),
          assignment,
        ],
      ),
    );

  let changedDiscoveries =
    0;

  const changes =
    new Map<
      string,
      {
        sourceGalaxy: string;
        canonicalGalaxy: string;
        action:
          | "merge"
          | "group";
      }
    >();

  const updated =
    discoveries.map(
      (discovery):
      Discovery => {
        const discoveryWorkspace =
          discovery.workspaceId ??
          "private";

        if (
          discoveryWorkspace !==
          workspaceId
        ) {
          return discovery;
        }

        const classification =
          discovery.classification;

        if (!classification) {
          return discovery;
        }

        /*
         * Benutzerentscheidung bleibt
         * verbindlich.
         */
        if (
          classification.mode ===
          "manual"
        ) {
          return discovery;
        }

        const currentGalaxy =
          classification
            .secondaryCategory
            .trim();

        const assignment =
          assignmentMap.get(
            normalizeKey(
              currentGalaxy,
            ),
          );

        if (
          !assignment ||
          assignment.action ===
            "keep"
        ) {
          return discovery;
        }

        const canonicalGalaxy =
          assignment
            .canonicalGalaxy
            .trim();

        if (
          !canonicalGalaxy
        ) {
          return discovery;
        }

        /*
         * MERGE:
         * Nur Galaxienname
         * vereinheitlichen.
         */
        if (
          assignment.action ===
          "merge"
        ) {
          if (
            normalizeKey(
              currentGalaxy,
            ) ===
            normalizeKey(
              canonicalGalaxy,
            )
          ) {
            return discovery;
          }

          changedDiscoveries +=
            1;

          changes.set(
            `${assignment.action}:${normalizeKey(currentGalaxy)}`,
            {
              sourceGalaxy:
                currentGalaxy,

              canonicalGalaxy,

              action: "merge",
            },
          );

          return {
            ...discovery,

            classification: {
              ...classification,

              secondaryCategory:
                canonicalGalaxy,
            },

            updatedAt:
              new Date()
                .toISOString(),
          };
        }

        /*
         * GROUP:
         *
         * bisherige Galaxie wird Planet.
         * bisheriger Planet wird Stern.
         *
         * Beispiel:
         *
         * Bergsteigen
         *   -> Hochtouren
         *
         * wird
         *
         * Outdoor & Freizeit
         *   -> Bergsteigen
         *      -> Hochtouren
         */
        const previousTopic =
          classification
            .topic
            .trim();

        const nextTopic =
          currentGalaxy;

        const nextSubtopics =
          uniqueStrings([
            ...(previousTopic &&
            normalizeKey(
              previousTopic,
            ) !==
              normalizeKey(
                nextTopic,
              )
              ? [
                  previousTopic,
                ]
              : []),

            ...classification
              .subtopics,
          ])
            .slice(0, 6);

        changedDiscoveries +=
          1;

        changes.set(
          `${assignment.action}:${normalizeKey(currentGalaxy)}`,
          {
            sourceGalaxy:
              currentGalaxy,

            canonicalGalaxy,

            action: "group",
          },
        );

        return {
          ...discovery,

          classification: {
            ...classification,

            secondaryCategory:
              canonicalGalaxy,

            topic:
              nextTopic,

            subtopics:
              nextSubtopics,
          },

          topics:
            uniqueStrings([
              nextTopic,
              ...nextSubtopics,
            ]),

          updatedAt:
            new Date()
              .toISOString(),
        };
      },
    );

  if (
    changedDiscoveries > 0
  ) {
    await repository.saveAll(
      updated,
    );
  }

  const changeList =
    [...changes.values()];

  return {
    changedDiscoveries,

    mergedGalaxies:
      changeList.filter(
        (change) =>
          change.action ===
          "merge",
      ).length,

    groupedGalaxies:
      changeList.filter(
        (change) =>
          change.action ===
          "group",
      ).length,

    changes:
      changeList,
  };
}

function uniqueStrings(
  values: string[],
): string[] {
  return [
    ...new Map(
      values
        .map(
          (value) =>
            value.trim(),
        )
        .filter(
          (value) =>
            value.length >= 2,
        )
        .map(
          (value) => [
            normalizeKey(value),
            value,
          ],
        ),
    ).values(),
  ];
}

function normalizeKey(
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
