import OpenAI from "openai";
import {
  zodTextFormat,
} from "openai/helpers/zod";
import { z } from "zod/v3";

import type {
  Discovery,
} from "@savewise/shared";

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
    timeout: 55_000,
    maxRetries: 1,
  });

const GalaxyAssignmentSchema =
  z.object({
    sourceGalaxy:
      z.string()
        .min(2)
        .max(80),

    canonicalGalaxy:
      z.string()
        .min(2)
        .max(80),

    action:
      z.enum([
        "keep",
        "merge",
        "group",
      ]),

    confidence:
      z.number()
        .min(0)
        .max(1),

    reason:
      z.string()
        .min(5)
        .max(300),
  });

const GalaxyOrganizationSchema =
  z.object({
    summary:
      z.string()
        .min(10)
        .max(600),

    assignments:
      z.array(
        GalaxyAssignmentSchema,
      )
        .min(1)
        .max(100),
  });

export type GalaxyAssignment = {
  sourceGalaxy: string;
  canonicalGalaxy: string;
  action:
    | "keep"
    | "merge"
    | "group";
  confidence: number;
  reason: string;
};

export type GalaxyOrganization = {
  summary: string;
  assignments:
    GalaxyAssignment[];
};

type GalaxyInput = {
  name: string;
  discoveryCount: number;
  locked: boolean;
  planets: string[];
  examples: string[];
};

export async function organizeGalaxies(
  discoveries: Discovery[],
): Promise<GalaxyOrganization> {
  const galaxies =
    buildGalaxyInput(
      discoveries,
    );

  if (
    galaxies.length === 0
  ) {
    return {
      summary:
        "Keine Galaxien vorhanden.",
      assignments: [],
    };
  }

  if (
    galaxies.length === 1
  ) {
    return {
      summary:
        "Keine Konsolidierung erforderlich.",

      assignments: [{
        sourceGalaxy:
          galaxies[0].name,
        canonicalGalaxy:
          galaxies[0].name,
        action: "keep",
        confidence: 1,
        reason:
          "Es existiert nur eine Galaxie.",
      }],
    };
  }

  const response =
    await openai.responses.parse({
      model:
        "gpt-4.1-mini",

      instructions: [
        "You are SaveWise Galaxy Organizer.",
        "Your only task is to design the top level of one user's personal knowledge universe.",
        "You receive the currently stored galaxies, representative planets and example discovery titles.",
        "",
        "SaveWise hierarchy:",
        "Galaxy -> Planet -> Stars -> Discovery.",
        "",
        "For every supplied source galaxy choose exactly one action:",
        "",
        "KEEP:",
        "The galaxy is already a useful broad long-term knowledge area.",
        "",
        "MERGE:",
        "Use only for true synonyms, spelling variants, translations, singular/plural variants or essentially identical concepts.",
        "Example: Freizeit and Freizeitaktivitäten may become Freizeit.",
        "MERGE must not be used merely because two areas are related.",
        "",
        "GROUP:",
        "Use when several narrower galaxies would form a better reusable higher-level galaxy.",
        "Example: Bergsteigen, Gleitschirmfliegen and Outdoor-Aktivitäten may become Outdoor & Freizeit.",
        "When using GROUP, the original galaxy will later become a Planet below the new Galaxy.",
        "",
        "Do not create vague dumping grounds such as Lifestyle, General, Allgemein, Sonstiges, Other, Miscellaneous, Interests or Knowledge.",
        "Do not group unrelated subjects just to reduce the number of galaxies.",
        "Shopping must not automatically become Lifestyle.",
        "Robotik must not automatically become Technologie unless the supplied library genuinely benefits from that broader structure.",
        "",
        "Prefer stable broad domains that would still make sense when the user's library grows substantially.",
        "A current galaxy that describes a narrow activity, product type, technology, company or technique is often better as a Planet.",
        "",
        "For a library of this size, prefer roughly 8 to 15 strong top-level galaxies when the semantic structure supports it.",
        "This is a target, not a hard rule. Preserve more galaxies when necessary.",
        "",
        "Multiple GROUP assignments can share the same newly created canonicalGalaxy.",
        "Multiple MERGE assignments can share the same canonicalGalaxy.",
        "",
        "A locked galaxy contains at least one manually classified discovery.",
        "A locked galaxy must keep its own name and must use action KEEP.",
        "Other non-locked galaxies may merge or group into a locked galaxy when semantically appropriate.",
        "",
        "Prefer canonical labels in the dominant language of the supplied library.",
        "Return one assignment for every supplied source galaxy.",
      ].join("\n"),

      input:
        JSON.stringify({
          currentGalaxyCount:
            galaxies.length,

          preferredGalaxyRange: {
            minimum: 8,
            maximum: 15,
          },

          galaxies,
        }),

      text: {
        format:
          zodTextFormat(
            GalaxyOrganizationSchema,
            "savewise_galaxy_organization",
          ),
      },
    });

  if (
    !response.output_parsed
  ) {
    throw new Error(
      "AI returned no galaxy organization.",
    );
  }

  return normalizeOrganization(
    galaxies,
    response.output_parsed,
  );
}

function buildGalaxyInput(
  discoveries: Discovery[],
): GalaxyInput[] {
  const groups =
    new Map<
      string,
      {
        name: string;
        discoveries:
          Discovery[];
      }
    >();

  for (
    const discovery
    of discoveries
  ) {
    const galaxy =
      discovery.classification
        ?.secondaryCategory
        ?.trim();

    if (!galaxy) {
      continue;
    }

    const key =
      normalizeKey(
        galaxy,
      );

    const current =
      groups.get(key) ?? {
        name: galaxy,
        discoveries: [],
      };

    current.discoveries.push(
      discovery,
    );

    groups.set(
      key,
      current,
    );
  }

  return [...groups.values()]
    .map(
      ({
        name,
        discoveries:
          galaxyDiscoveries,
      }) => ({
        name,

        discoveryCount:
          galaxyDiscoveries.length,

        locked:
          galaxyDiscoveries.some(
            (discovery) =>
              discovery.classification
                ?.mode ===
              "manual",
          ),

        planets:
          uniqueStrings(
            galaxyDiscoveries.map(
              (discovery) =>
                discovery.classification
                  ?.topic ??
                "",
            ),
          )
            .filter(Boolean)
            .slice(0, 8),

        examples:
          galaxyDiscoveries
            .map(
              (discovery) =>
                discovery.improvedTitle ||
                discovery.title,
            )
            .filter(Boolean)
            .slice(0, 3),
      }),
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.discoveryCount -
        left.discoveryCount,
    );
}

function normalizeOrganization(
  galaxies: GalaxyInput[],
  result: z.infer<
    typeof GalaxyOrganizationSchema
  >,
): GalaxyOrganization {
  const inputByKey =
    new Map(
      galaxies.map(
        (galaxy) => [
          normalizeKey(
            galaxy.name,
          ),
          galaxy,
        ],
      ),
    );

  const returned =
    new Map<
      string,
      GalaxyAssignment
    >();

  for (
    const assignment
    of result.assignments
  ) {
    const key =
      normalizeKey(
        assignment.sourceGalaxy,
      );

    const input =
      inputByKey.get(key);

    if (!input) {
      continue;
    }

    /*
     * Manuelle Klassifikationen sind
     * feste Anker.
     */
    if (input.locked) {
      returned.set(
        key,
        {
          sourceGalaxy:
            input.name,
          canonicalGalaxy:
            input.name,
          action: "keep",
          confidence: 1,
          reason:
            "Manuell festgelegte Galaxie bleibt unverändert.",
        },
      );

      continue;
    }

    returned.set(
      key,
      {
        sourceGalaxy:
          input.name,

        canonicalGalaxy:
          cleanLabel(
            assignment
              .canonicalGalaxy,
          ) || input.name,

        action:
          assignment.action,

        confidence:
          assignment.confidence,

        reason:
          assignment.reason.trim(),
      },
    );
  }

  /*
   * Fehlende KI-Antworten werden
   * niemals geraten, sondern KEEP.
   */
  for (
    const galaxy
    of galaxies
  ) {
    const key =
      normalizeKey(
        galaxy.name,
      );

    if (
      returned.has(key)
    ) {
      continue;
    }

    returned.set(
      key,
      {
        sourceGalaxy:
          galaxy.name,
        canonicalGalaxy:
          galaxy.name,
        action: "keep",
        confidence: 1,
        reason:
          "Keine sichere Änderung vorgeschlagen.",
      },
    );
  }

  return {
    summary:
      result.summary.trim(),

    assignments:
      [...returned.values()],
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
        .filter(Boolean)
        .map(
          (value) => [
            normalizeKey(value),
            value,
          ],
        ),
    ).values(),
  ];
}

function cleanLabel(
  value: string,
): string {
  return value
    .replace(
      /\s+/g,
      " ",
    )
    .trim()
    .slice(
      0,
      60,
    );
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
