import type {
  WorkspaceId,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../../repositories/discovery-repository";

import {
  rebuildCurrentKnowledgeLibrary,
} from "./discovery-service";


type PlanetReplacement = {
  galaxy: string;
  from: string;
  to: string;
};


/*
 * Einmalige Bereinigung bestätigter
 * Planet-Schreibdubletten.
 *
 * Immer galaxiegebunden.
 */
const PLANET_LABEL_REPLACEMENTS:
  PlanetReplacement[] = [
    {
      galaxy:
        "Robotics and Autonomous Systems",

      from:
        "robotik",

      to:
        "Robotik",
    },

    {
      galaxy:
        "Security Technologies",

      from:
        "Sicherheitstechnologie",

      to:
        "Sicherheitstechnologien",
    },

    {
      galaxy:
        "Security Technologies",

      from:
        "sicherheit",

      to:
        "Sicherheit",
    },
  ];


export async function migrateKnownPlanetLabelDuplicates(
  repository:
    DiscoveryRepository,

  workspaceId:
    WorkspaceId =
      "private",
): Promise<{
  changed: number;

  replacements:
    {
      discoveryId:
        string;

      galaxy:
        string;

      from:
        string;

      to:
        string;
    }[];
}> {
  const discoveries =
    await repository.getAll();

  const replacements:
    {
      discoveryId:
        string;

      galaxy:
        string;

      from:
        string;

      to:
        string;
    }[] =
    [];

  const next =
    discoveries.map(
      (discovery) => {
        const discoveryWorkspaceId =
          discovery.workspaceId ??
          "private";

        if (
          discoveryWorkspaceId !==
          workspaceId
        ) {
          return discovery;
        }

        const classification =
          discovery.classification;

        if (!classification) {
          return discovery;
        }

        const galaxy =
          classification
            .secondaryCategory
            ?.trim();

        const planet =
          classification
            .topic
            ?.trim();

        if (
          !galaxy ||
          !planet
        ) {
          return discovery;
        }

        const replacement =
          PLANET_LABEL_REPLACEMENTS
            .find(
              (candidate) =>
                candidate.galaxy ===
                  galaxy &&
                candidate.from ===
                  planet,
            );

        if (!replacement) {
          return discovery;
        }

        replacements.push({
          discoveryId:
            discovery.id,

          galaxy,

          from:
            planet,

          to:
            replacement.to,
        });

        const nextSubtopics =
          classification
            .subtopics ?? [];

        return {
          ...discovery,

          classification: {
            ...classification,

            topic:
              replacement.to,
          },

          topics: [
            replacement.to,
            ...nextSubtopics,
          ].filter(Boolean),

          updatedAt:
            new Date()
              .toISOString(),
        };
      },
    );

  if (
    replacements.length ===
    0
  ) {
    console.log(
      "[Planet Label Migration]",
      JSON.stringify({
        workspaceId,
        changed:
          0,
        status:
          "already-clean",
      }),
    );

    return {
      changed:
        0,

      replacements:
        [],
    };
  }

  await repository.saveAll(
    next,
  );

  await rebuildCurrentKnowledgeLibrary(
    repository,
    workspaceId,
  );

  console.log(
    "[Planet Label Migration]",
    JSON.stringify({
      workspaceId,

      changed:
        replacements.length,

      replacements,

      status:
        "completed",
    }),
  );

  return {
    changed:
      replacements.length,

    replacements,
  };
}
