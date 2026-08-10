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

type ExplicitTaxonomyCorrection = {
  discoveryId: string;
  exactTitle: string;
  expectedPath: KnowledgePath;
  correctedPath: KnowledgePath;
};

export type TaxonomyCorrectionPreview = {
  discoveryId: string;
  title: string;
  oldPath: KnowledgePath;
  newPath: KnowledgePath;
};

export type ExplicitTaxonomyMigrationResult = {
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
 * One-time correction catalogue for the private library reviewed on
 * 2026-08-10. Every entry is deliberately tied to both an immutable ID
 * and the exact reviewed title. There are no fuzzy matches or general
 * classification rules in this module.
 */
export const EXPLICIT_TAXONOMY_CORRECTIONS:
  readonly ExplicitTaxonomyCorrection[] = [
  /* Placeholder Galaxy/Planet/Stars path: The Line is urban development. */
  {
    discoveryId: "2888de94-3f1d-4180-b677-6727c6cdf15f",
    exactTitle: "Was passierte mit dem Stadtentwicklungsprojekt The Line?",
    expectedPath: {
      secondaryCategory: "Galaxy",
      topic: "Planet",
      subtopics: ["Stars"],
    },
    correctedPath: {
      secondaryCategory: "Städtebau und Urbanisierung",
      topic: "Stadtentwicklungsprojekte",
      subtopics: ["The Line", "Stadtplanung"],
    },
  },

  /* Placeholder Galaxy/Planet/Stars path: the subject is Indian archaeology. */
  {
    discoveryId: "a4539448-b59f-420a-8c07-e2f5aa06386d",
    exactTitle: "Ungewöhnliche antike Bauwerke in Indien: Hinweise auf fremde Zivilisationen",
    expectedPath: {
      secondaryCategory: "Galaxy",
      topic: "Planet",
      subtopics: ["Stars"],
    },
    correctedPath: {
      secondaryCategory: "Archäologie",
      topic: "Antike Bauwerke",
      subtopics: ["Ungewöhnliche Architektur", "Indische Geschichte"],
    },
  },

  /* An accident report is current affairs, not a security technology. */
  {
    discoveryId: "b31b9d33-00cd-4ddc-94bb-7e87775dfb03",
    exactTitle: "Tödlicher Unfall eines GSG 9-Bundespolizisten bei Schießtraining in Putlos",
    expectedPath: {
      secondaryCategory: "Security Technologies",
      topic: "Sicherheit",
      subtopics: [
        "öffentliche sicherheit",
        "polizeiliche einsätze",
        "unfallberichte",
        "spezialeinheiten",
      ],
    },
    correctedPath: {
      secondaryCategory: "Politics and Current Affairs",
      topic: "Nachrichten und Aktuelles",
      subtopics: [
        "öffentliche sicherheit",
        "polizeiliche einsätze",
        "unfallberichte",
        "spezialeinheiten",
      ],
    },
  },

  /* A blocked fuel-can product page is product knowledge, not software development. */
  {
    discoveryId: "fad4d5b7-d96d-42a0-9e62-9774364a5ac3",
    exactTitle: "Zugang verweigert: Fehler beim Zugriff auf Benzinkanister 20l Produktseite",
    expectedPath: {
      secondaryCategory: "Software Development and AI",
      topic: "Webzugriffsprobleme",
      subtopics: ["HTTP Fehler", "Zugriffsrechte"],
    },
    correctedPath: {
      secondaryCategory: "Shopping",
      topic: "Kraftstoffbehälter",
      subtopics: ["Benzinkanister", "Produktseiten"],
    },
  },

  /* Armed military robots belong to military technology. */
  {
    discoveryId: "4fa8990b-5ca8-484f-826e-126f77eeb670",
    exactTitle: "Militärische Vierbeiner: Robotermodelle mit und ohne Bewaffnung im Fokus",
    expectedPath: {
      secondaryCategory: "Technology & Engineering",
      topic: "Robotics and Autonomous Systems",
      subtopics: [
        "Robotik",
        "militärische robotersysteme",
        "bewaffnete roboter",
        "robotik im sicherheitsbereich",
        "autonome waffentechnologie",
      ],
    },
    correctedPath: {
      secondaryCategory: "Military Technology",
      topic: "Robotik und autonome Systeme",
      subtopics: [
        "Robotik",
        "militärische robotersysteme",
        "bewaffnete roboter",
        "robotik im sicherheitsbereich",
        "autonome waffentechnologie",
      ],
    },
  },

  /* The described future combat machines are military robotic systems. */
  {
    discoveryId: "61c760ed-e99e-4c1c-bc82-79df133328b3",
    exactTitle: "Fortschritte bei zukünftigen robotischen Kampfmaschinen: Sigmas Flex Roboter",
    expectedPath: {
      secondaryCategory: "Technology & Engineering",
      topic: "Robotics and Autonomous Systems",
      subtopics: [
        "Robotik",
        "Autonome Systeme",
        "Militärroboter",
        "Maschinelles Lernen",
        "Robotikentwicklung",
      ],
    },
    correctedPath: {
      secondaryCategory: "Military Technology",
      topic: "Robotik und autonome Systeme",
      subtopics: [
        "Robotik",
        "Autonome Systeme",
        "Militärroboter",
        "Maschinelles Lernen",
        "Robotikentwicklung",
      ],
    },
  },

  /* A catalogue of AI models belongs to the established AI/software galaxy. */
  {
    discoveryId: "4fd09669-9082-402c-8ca9-e9641547ab83",
    exactTitle: "Über 80 führende KI-Modelle kostenlos verfügbar",
    expectedPath: {
      secondaryCategory: "Technology & Engineering",
      topic: "Technologie & Ingenieurwesen",
      subtopics: [
        "Künstliche Intelligenz",
        "KI-Modelle",
        "Maschinelles Lernen",
        "Open-Source-Modelle",
      ],
    },
    correctedPath: {
      secondaryCategory: "Software Development and AI",
      topic: "Künstliche Intelligenz (KI)",
      subtopics: [
        "Künstliche Intelligenz",
        "KI-Modelle",
        "Maschinelles Lernen",
        "Open-Source-Modelle",
      ],
    },
  },

  /* The following five reviewed Shopping entries are explicitly heating products. */
  {
    discoveryId: "711962d5-b69e-44bf-b01a-7ed531ecd3bf",
    exactTitle: "Ofenrohre Sets für Heizöfen und Schwedenöfen bei Hornbach",
    expectedPath: {
      secondaryCategory: "Shopping",
      topic: "Ofenzubehör",
      subtopics: ["Ofenrohre", "Schwedenöfen"],
    },
    correctedPath: {
      secondaryCategory: "Home Technology and Heating",
      topic: "Ofentechnik",
      subtopics: ["Ofenrohre", "Schwedenöfen"],
    },
  },
  {
    discoveryId: "95660734-8e1f-4cbc-aff0-fb92ddf1c0b3",
    exactTitle: "Ofenrohr Erweiterung von 130 mm auf 150 mm, 2 mm stark, schwarz",
    expectedPath: {
      secondaryCategory: "Shopping",
      topic: "Heizungstechnik",
      subtopics: ["Ofenrohre", "Anschlusskomponenten"],
    },
    correctedPath: {
      secondaryCategory: "Home Technology and Heating",
      topic: "Ofentechnik",
      subtopics: ["Ofenrohre", "Anschlusskomponenten"],
    },
  },
  {
    discoveryId: "aedeb1ca-b971-43bd-9191-0190357433bc",
    exactTitle: "Bertrams Ofenrohr Ø 120 mm Senotherm UHT Hydro Schwarz 0,25 m - Produktübersicht",
    expectedPath: {
      secondaryCategory: "Shopping",
      topic: "Heiz- & Kaminzubehör",
      subtopics: ["Ofenrohre", "Senotherm-Beschichtung"],
    },
    correctedPath: {
      secondaryCategory: "Home Technology and Heating",
      topic: "Ofentechnik",
      subtopics: ["Ofenrohre", "Senotherm-Beschichtung"],
    },
  },
  {
    discoveryId: "58d3824d-bd36-4220-904f-b05c4324bf02",
    exactTitle: "Schwarze Ofenrohr-Reduzierung von 130 mm auf 120 mm mit 2mm Stärke",
    expectedPath: {
      secondaryCategory: "Shopping",
      topic: "Haustechnik",
      subtopics: ["Ofenrohrzubehör", "Reduzierungen", "Materialeigenschaften"],
    },
    correctedPath: {
      secondaryCategory: "Home Technology and Heating",
      topic: "Ofentechnik",
      subtopics: ["Ofenrohrzubehör", "Reduzierungen", "Materialeigenschaften"],
    },
  },
  {
    discoveryId: "f0ed05ad-e25e-4537-afb0-68698e6a3185",
    exactTitle: "Große Auswahl an Ofenrohren mit 130 mm Durchmesser – Verschiedene Längen und Formen",
    expectedPath: {
      secondaryCategory: "Shopping",
      topic: "Heizung und Ofenzubehör",
      subtopics: [
        "Ofenrohrdurchmesser 130 mm",
        "Ofenrohrformen (Bögen",
        "Winkel)",
        "Materialien und Beschichtungen",
      ],
    },
    correctedPath: {
      secondaryCategory: "Home Technology and Heating",
      topic: "Ofentechnik",
      subtopics: [
        "Ofenrohrdurchmesser 130 mm",
        "Ofenrohrformen (Bögen",
        "Winkel)",
        "Materialien und Beschichtungen",
      ],
    },
  },

  /* A reversible paragliding harness is paragliding equipment. */
  {
    discoveryId: "92c85966-f73b-40a0-a1ed-02747721ab0f",
    exactTitle: "PROGRESS 4 Wendegurtzeug mit aufblasbarem Protektor und hohem Komfort",
    expectedPath: {
      secondaryCategory: "Shopping",
      topic: "Flugausrüstung",
      subtopics: ["Wendegurtzeuge", "Schutzsysteme", "Rucksackfunktionen"],
    },
    correctedPath: {
      secondaryCategory: "Paragliding",
      topic: "Gurtzeuge für Gleitschirmsport",
      subtopics: ["Wendegurtzeuge", "Schutzsysteme", "Rucksackfunktionen"],
    },
  },

  /* A rowing machine belongs to fitness and sports. */
  {
    discoveryId: "e7931ea8-9219-4159-8f02-402ab6b5b5d4",
    exactTitle: "Nautilus Row Rudergerät – Gebraucht günstig kaufen",
    expectedPath: {
      secondaryCategory: "Shopping",
      topic: "Fitnessgerät",
      subtopics: ["Rudergerät"],
    },
    correctedPath: {
      secondaryCategory: "Fitness and Sports",
      topic: "Fitness",
      subtopics: ["Rudergerät"],
    },
  },

  /* These three reviewed entries explicitly describe paragliding or its equipment. */
  {
    discoveryId: "d1439cea-a4c6-42f2-8863-ff483f51b214",
    exactTitle: "Paragliding in den Beskiden: Start und Flug",
    expectedPath: {
      secondaryCategory: "Lifestyle and Leisure",
      topic: "Lifestyle und Freizeit",
      subtopics: ["Extremsport", "Gleitschirmfliegen", "Outdoor-Sport"],
    },
    correctedPath: {
      secondaryCategory: "Paragliding",
      topic: "Luftfahrt & Gleitschirmfliegen",
      subtopics: ["Extremsport", "Gleitschirmfliegen", "Outdoor-Sport"],
    },
  },
  {
    discoveryId: "ab0f7091-5dbe-45c0-9419-e19a78acf8d2",
    exactTitle: "Gleitschirmfliegen im Sommer über Interlaken, Schweiz",
    expectedPath: {
      secondaryCategory: "Lifestyle and Leisure",
      topic: "Lifestyle und Freizeit",
      subtopics: [
        "Extremsportarten",
        "Gleitschirmfliegen",
        "Sommeraktivitäten",
        "Tourismus in der Schweiz",
      ],
    },
    correctedPath: {
      secondaryCategory: "Paragliding",
      topic: "Luftfahrt & Gleitschirmfliegen",
      subtopics: [
        "Extremsportarten",
        "Gleitschirmfliegen",
        "Sommeraktivitäten",
        "Tourismus in der Schweiz",
      ],
    },
  },
  {
    discoveryId: "4edfa034-cd00-4072-8030-08d87ba0afea",
    exactTitle: "Skywalk Smartbag: Leichter Kompressionspacksack für Gleitschirme mit flexiblen Rigid Foils",
    expectedPath: {
      secondaryCategory: "Fitness and Sports",
      topic: "Freizeit",
      subtopics: [
        "Gleitschirmfliegen",
        "Ausrüstung",
        "Gleitschirm Packsäcke",
        "Kompressionstechnik",
      ],
    },
    correctedPath: {
      secondaryCategory: "Paragliding",
      topic: "Gleitschirmausrüstung",
      subtopics: [
        "Gleitschirmfliegen",
        "Ausrüstung",
        "Gleitschirm Packsäcke",
        "Kompressionstechnik",
      ],
    },
  },
] as const;

/**
 * Produces a strict dry-run. It never mutates a Discovery and has no
 * persistence dependency. Missing IDs and title mismatches fail closed.
 */
export function previewExplicitTaxonomyCorrections(
  discoveries: Discovery[],
): TaxonomyCorrectionPreview[] {
  const discoveriesById =
    new Map(
      discoveries.map((discovery) => [
        discovery.id,
        discovery,
      ]),
    );

  return EXPLICIT_TAXONOMY_CORRECTIONS.map(
    (correction) => {
      const discovery =
        discoveriesById.get(
          correction.discoveryId,
        );

      if (!discovery) {
        throw new Error(
          `Explicit taxonomy correction target not found: ${correction.discoveryId}.`,
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

      if (!classification) {
        throw new Error(
          `Discovery ${correction.discoveryId} has no classification.`,
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
 * Applies the reviewed one-time migration through the normal Discovery
 * repository. The complete collection is persisted once and only when
 * at least one exact source match changes. This function deliberately
 * does not rebuild the KnowledgeGraph or invoke any AI/organizer code.
 */
export async function migrateExplicitTaxonomyCorrections(
  repository: DiscoveryRepository,
  workspaceId: WorkspaceId = "private",
): Promise<ExplicitTaxonomyMigrationResult> {
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
    ExplicitTaxonomyMigrationResult["conflictDetails"] = [];

  const pendingCorrections: Array<{
    discoveryIndex: number;
    correction: ExplicitTaxonomyCorrection;
  }> = [];

  for (const correction of EXPLICIT_TAXONOMY_CORRECTIONS) {
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
      "[Explicit Taxonomy Migration] conflict",
      JSON.stringify({
        workspaceId,
        ...conflict,
      }),
    );
  }

  /*
   * Fail closed: validation of all 17 entries must finish without a
   * single conflict before any corrected collection is constructed or
   * passed to the repository.
   */
  if (conflictDetails.length > 0) {
    const result: ExplicitTaxonomyMigrationResult = {
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

  const result: ExplicitTaxonomyMigrationResult = {
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
  result: ExplicitTaxonomyMigrationResult,
): void {
  console.log(
    "[Explicit Taxonomy Migration]",
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
    arraysEqual(
      actual.subtopics,
      expected.subtopics,
    )
  );
}

function arraysEqual(
  left: string[],
  right: string[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (value, index) =>
        value === right[index],
    )
  );
}
