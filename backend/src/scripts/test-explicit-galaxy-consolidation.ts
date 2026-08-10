import assert from "node:assert/strict";
import test from "node:test";

import type {
  Discovery,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../repositories/discovery-repository";
import {
  EXPLICIT_GALAXY_CONSOLIDATION_RULES,
  migrateExplicitGalaxyConsolidation,
} from "../services/discoveries/explicit-galaxy-consolidation";

class MemoryDiscoveryRepository
implements DiscoveryRepository {
  saveCount = 0;

  constructor(
    private discoveries:
      Discovery[],
  ) {}

  async getAll(): Promise<Discovery[]> {
    return structuredClone(
      this.discoveries,
    );
  }

  async saveAll(
    discoveries: Discovery[],
  ): Promise<void> {
    this.saveCount += 1;
    this.discoveries =
      structuredClone(discoveries);
  }
}

test("applies the complete consolidation once", async () => {
  const repository =
    new MemoryDiscoveryRepository(
      createSourceDiscoveries(),
    );

  const result =
    await migrateExplicitGalaxyConsolidation(
      repository,
      "private",
    );

  assert.equal(result.changed, 32);
  assert.equal(result.alreadyCorrect, 0);
  assert.equal(result.conflicts, 0);
  assert.equal(result.preview.length, 32);
  assert.equal(repository.saveCount, 1);

  const grouped =
    result.preview.find(
      (entry) =>
        entry.oldPath.secondaryCategory ===
        "Military Technology",
    );

  assert.ok(grouped);
  assert.equal(
    grouped.newPath.secondaryCategory,
    "Sicherheits- und Verteidigungstechnologie",
  );
  assert.equal(
    grouped.newPath.topic,
    "Military Technology",
  );
  assert.deepEqual(
    grouped.newPath.subtopics,
    [grouped.oldPath.topic, ...grouped.oldPath.subtopics],
  );

  const merged =
    result.preview.find(
      (entry) =>
        entry.oldPath.secondaryCategory ===
        "Travel and Exploration",
    );

  assert.ok(merged);
  assert.equal(
    merged.newPath.secondaryCategory,
    "Reisen & Entdeckung",
  );
  assert.equal(
    merged.newPath.topic,
    merged.oldPath.topic,
  );
  assert.deepEqual(
    merged.newPath.subtopics,
    merged.oldPath.subtopics,
  );
});

test("is idempotent on the second run", async () => {
  const repository =
    new MemoryDiscoveryRepository(
      createSourceDiscoveries(),
    );

  await migrateExplicitGalaxyConsolidation(
    repository,
    "private",
  );

  const second =
    await migrateExplicitGalaxyConsolidation(
      repository,
      "private",
    );

  assert.equal(second.changed, 0);
  assert.equal(second.alreadyCorrect, 32);
  assert.equal(second.conflicts, 0);
  assert.equal(second.preview.length, 0);
  assert.equal(repository.saveCount, 1);
});

test("fails closed when a source set conflicts", async () => {
  const discoveries =
    createSourceDiscoveries();

  discoveries[0] = {
    ...discoveries[0],
    classification: {
      ...discoveries[0].classification!,
      secondaryCategory:
        "Unexpected Galaxy",
    },
  };

  const repository =
    new MemoryDiscoveryRepository(
      discoveries,
    );

  const result =
    await migrateExplicitGalaxyConsolidation(
      repository,
      "private",
    );

  assert.equal(result.changed, 0);
  assert.ok(result.conflicts > 0);
  assert.equal(result.preview.length, 0);
  assert.equal(repository.saveCount, 0);
  assert.deepEqual(
    await repository.getAll(),
    discoveries,
  );
});

function createSourceDiscoveries(): Discovery[] {
  const discoveries:
    Discovery[] = [];

  for (const rule of EXPLICIT_GALAXY_CONSOLIDATION_RULES) {
    for (
      let index = 0;
      index < rule.expectedCount;
      index += 1
    ) {
      const topic =
        rule.action === "merge"
          ? rule.consolidatedTopic
          : `${rule.sourceGalaxy} Topic ${index + 1}`;

      discoveries.push({
        id:
          `${rule.action}-${rule.sourceGalaxy}-${index}`,
        workspaceId:
          "private",
        source:
          "web",
        title:
          `${rule.sourceGalaxy} Discovery ${index + 1}`,
        classification: {
          primaryCategory:
            "other",
          secondaryCategory:
            rule.sourceGalaxy,
          topic,
          subtopics: [
            `${rule.sourceGalaxy} Detail ${index + 1}`,
          ],
        },
        keywords: [],
        topics: [topic],
        createdAt:
          "2026-08-10T00:00:00.000Z",
        updatedAt:
          "2026-08-10T00:00:00.000Z",
        savedAtLabel:
          "10.8.2026",
      });
    }
  }

  /* Existing native target content must survive the translation merge. */
  discoveries.push({
    id: "native-travel",
    workspaceId: "private",
    source: "web",
    title: "Native travel discovery",
    classification: {
      primaryCategory: "other",
      secondaryCategory:
        "Reisen & Entdeckung",
      topic:
        "Unterkunft & Reservierungen",
      subtopics: ["Hotel"],
    },
    keywords: [],
    topics: ["Unterkunft & Reservierungen"],
    createdAt: "2026-08-10T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    savedAtLabel: "10.8.2026",
  });

  return discoveries;
}
