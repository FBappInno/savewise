import assert from "node:assert/strict";
import test from "node:test";

import type {
  Discovery,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../repositories/discovery-repository";
import {
  EXPLICIT_TAXONOMY_CORRECTIONS,
  migrateExplicitTaxonomyCorrections,
} from "../services/discoveries/explicit-taxonomy-corrections";

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

test("applies all corrections once and is idempotent", async () => {
  const repository =
    new MemoryDiscoveryRepository(
      createSourceDiscoveries(),
    );

  const first =
    await migrateExplicitTaxonomyCorrections(
      repository,
      "private",
    );

  assert.equal(first.changed, 17);
  assert.equal(first.alreadyCorrect, 0);
  assert.equal(first.conflicts, 0);
  assert.equal(repository.saveCount, 1);

  const second =
    await migrateExplicitTaxonomyCorrections(
      repository,
      "private",
    );

  assert.equal(second.changed, 0);
  assert.equal(second.alreadyCorrect, 17);
  assert.equal(second.conflicts, 0);
  assert.equal(
    repository.saveCount,
    1,
    "an already-correct run must not persist again",
  );
});

test("does not overwrite an unexpected title", async () => {
  const discoveries =
    createSourceDiscoveries();

  discoveries[0] = {
    ...discoveries[0],
    improvedTitle:
      "Unexpected title",
  };

  const repository =
    new MemoryDiscoveryRepository(
      discoveries,
    );

  const result =
    await migrateExplicitTaxonomyCorrections(
      repository,
      "private",
    );

  assert.equal(result.changed, 0);
  assert.equal(result.alreadyCorrect, 0);
  assert.equal(result.conflicts, 1);
  assert.equal(
    repository.saveCount,
    0,
  );
  assert.deepEqual(
    result.conflictDetails[0],
    {
      discoveryId:
        EXPLICIT_TAXONOMY_CORRECTIONS[0].discoveryId,
      reason:
        "title-mismatch",
    },
  );

  const stored =
    await repository.getAll();

  assert.deepEqual(
    stored,
    discoveries,
    "a title conflict must leave all 17 discoveries unchanged",
  );
});

test("does not overwrite an unexpected source path", async () => {
  const discoveries =
    createSourceDiscoveries();

  discoveries[0] = {
    ...discoveries[0],
    classification: {
      ...discoveries[0].classification!,
      topic:
        "Unexpected topic",
    },
  };

  const repository =
    new MemoryDiscoveryRepository(
      discoveries,
    );

  const result =
    await migrateExplicitTaxonomyCorrections(
      repository,
      "private",
    );

  assert.equal(result.changed, 0);
  assert.equal(result.alreadyCorrect, 0);
  assert.equal(result.conflicts, 1);
  assert.equal(
    repository.saveCount,
    0,
  );
  assert.deepEqual(
    result.conflictDetails[0],
    {
      discoveryId:
        EXPLICIT_TAXONOMY_CORRECTIONS[0].discoveryId,
      reason:
        "source-path-mismatch",
    },
  );

  const stored =
    await repository.getAll();

  assert.deepEqual(
    stored,
    discoveries,
    "a source-path conflict must leave all 17 discoveries unchanged",
  );
});

function createSourceDiscoveries(): Discovery[] {
  return EXPLICIT_TAXONOMY_CORRECTIONS.map(
    (correction, index) => ({
      id:
        correction.discoveryId,
      workspaceId:
        "private",
      source:
        "web",
      title:
        correction.exactTitle,
      improvedTitle:
        correction.exactTitle,
      classification: {
        primaryCategory:
          "other",
        secondaryCategory:
          correction.expectedPath.secondaryCategory,
        topic:
          correction.expectedPath.topic,
        subtopics: [
          ...correction.expectedPath.subtopics,
        ],
      },
      keywords: [],
      topics: [
        correction.expectedPath.topic,
        ...correction.expectedPath.subtopics,
      ],
      createdAt:
        `2026-08-10T00:00:${String(index).padStart(2, "0")}.000Z`,
      updatedAt:
        `2026-08-10T00:00:${String(index).padStart(2, "0")}.000Z`,
      savedAtLabel:
        "10.8.2026",
    }),
  );
}
