import type {
  Discovery,
  KnowledgeGraph,
  WorkspaceId,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../../repositories/discovery-repository";

export type GalaxyCanonicalizationResult = {
  changedDiscoveries: number;

  mergedGalaxies: Array<{
    from: string;
    to: string;
  }>;
};

export async function canonicalizeDiscoveryGalaxies(
  repository: DiscoveryRepository,
  graph: KnowledgeGraph,
  workspaceId: WorkspaceId,
): Promise<GalaxyCanonicalizationResult> {
  const discoveries =
    await repository.getAll();

  /*
   * Nur echte Root-Domänen dürfen
   * kanonische Galaxien definieren.
   */
  const domains =
    graph.nodes.filter(
      (node) =>
        node.kind === "domain" &&
        node.parentId === null,
    );

  const canonicalByAlias =
    new Map<
      string,
      {
        title: string;
        ambiguous: boolean;
      }
    >();

  for (const domain of domains) {
    const canonicalTitle =
      domain.title.trim();

    const values = [
      canonicalTitle,
      ...domain.aliases,
    ];

    for (const value of values) {
      const key =
        normalizeGalaxyName(
          value,
        );

      if (!key) {
        continue;
      }

      const existing =
        canonicalByAlias.get(key);

      if (
        existing &&
        normalizeGalaxyName(
          existing.title,
        ) !==
          normalizeGalaxyName(
            canonicalTitle,
          )
      ) {
        /*
         * Derselbe Alias wurde mehreren
         * Galaxien zugeordnet.
         *
         * Dann ändern wir bewusst nichts.
         */
        canonicalByAlias.set(
          key,
          {
            title:
              existing.title,

            ambiguous: true,
          },
        );

        continue;
      }

      canonicalByAlias.set(
        key,
        {
          title:
            canonicalTitle,

          ambiguous: false,
        },
      );
    }
  }

  let changedDiscoveries = 0;

  const mergedGalaxies =
    new Map<string, string>();

  const updated =
    discoveries.map(
      (discovery): Discovery => {
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

        const currentGalaxy =
          classification
            .secondaryCategory
            .trim();

        if (!currentGalaxy) {
          return discovery;
        }

        const match =
          canonicalByAlias.get(
            normalizeGalaxyName(
              currentGalaxy,
            ),
          );

        if (
          !match ||
          match.ambiguous
        ) {
          return discovery;
        }

        const canonicalGalaxy =
          match.title.trim();

        if (
          normalizeGalaxyName(
            canonicalGalaxy,
          ) ===
          normalizeGalaxyName(
            currentGalaxy,
          )
        ) {
          /*
           * Gleicher kanonischer Begriff.
           * Groß-/Kleinschreibung nicht
           * unnötig verändern.
           */
          return discovery;
        }

        changedDiscoveries += 1;

        mergedGalaxies.set(
          currentGalaxy,
          canonicalGalaxy,
        );

        return {
          ...discovery,

          classification: {
            ...classification,

            secondaryCategory:
              canonicalGalaxy,
          },

          updatedAt:
            new Date().toISOString(),
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

  return {
    changedDiscoveries,

    mergedGalaxies:
      [...mergedGalaxies.entries()]
        .map(
          ([from, to]) => ({
            from,
            to,
          }),
        )
        .sort(
          (left, right) =>
            left.from.localeCompare(
              right.from,
            ),
        ),
  };
}

function normalizeGalaxyName(
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
