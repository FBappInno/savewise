import type {
  WorkspaceId,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../../repositories/discovery-repository";

import {
  rebuildCurrentKnowledgeLibrary,
} from "./discovery-service";


/*
 * Einmalige konservative Bereinigung bereits
 * bestätigter Galaxy-Schreibdubletten.
 *
 * WICHTIG:
 * Keine semantischen Synonyme.
 * Nur Varianten, die wir im Railway-Bestand
 * vorher explizit geprüft haben.
 */
const GALAXY_LABEL_REPLACEMENTS =
  new Map<
    string,
    string
  >([
    [
      "shopping",
      "Shopping",
    ],

    [
      "military technology",
      "Military Technology",
    ],

    [
      "3D Druck",
      "3D-Druck",
    ],

    [
      "Nutrition",
      "nutrition",
    ],
  ]);


export async function migrateKnownGalaxyLabelDuplicates(
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

      from:
        string;

      to:
        string;

      planet:
        string | null;
    }[];
}> {
  const discoveries =
    await repository.getAll();

  const replacements:
    {
      discoveryId:
        string;

      from:
        string;

      to:
        string;

      planet:
        string | null;
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

        if (
          !classification
        ) {
          return discovery;
        }

        const currentGalaxy =
          classification
            .secondaryCategory
            ?.trim();

        if (
          !currentGalaxy
        ) {
          return discovery;
        }

        const canonicalGalaxy =
          GALAXY_LABEL_REPLACEMENTS
            .get(
              currentGalaxy,
            );

        if (
          !canonicalGalaxy ||
          canonicalGalaxy ===
            currentGalaxy
        ) {
          return discovery;
        }

        replacements.push({
          discoveryId:
            discovery.id,

          from:
            currentGalaxy,

          to:
            canonicalGalaxy,

          planet:
            classification
              .topic ??
            null,
        });

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
      },
    );

  if (
    replacements.length ===
    0
  ) {
    console.log(
      "[Galaxy Label Migration]",
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

  /*
   * Genau EIN Schreibvorgang.
   */
  await repository.saveAll(
    next,
  );

  /*
   * Danach genau EIN vollständiger
   * Knowledge-Graph-Rebuild.
   */
  await rebuildCurrentKnowledgeLibrary(
    repository,
    workspaceId,
  );

  console.log(
    "[Galaxy Label Migration]",
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
