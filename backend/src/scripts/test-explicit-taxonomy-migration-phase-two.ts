import assert from "node:assert/strict";
import test from "node:test";

import type {
  Discovery,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "../repositories/discovery-repository";
import {
  EXPLICIT_TAXONOMY_CORRECTIONS_PHASE_TWO,
  migrateExplicitTaxonomyCorrectionsPhaseTwo,
} from "../services/discoveries/explicit-taxonomy-corrections-phase-two";

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

test("applies phase two once and is idempotent", async () => {
  const repository =
    new MemoryDiscoveryRepository(
      createSourceDiscoveries(),
    );

  const first =
    await migrateExplicitTaxonomyCorrectionsPhaseTwo(
      repository,
      "private",
    );

  assert.equal(first.changed, 4);
  assert.equal(first.alreadyCorrect, 0);
  assert.equal(first.conflicts, 0);
  assert.equal(repository.saveCount, 1);

  const second =
    await migrateExplicitTaxonomyCorrectionsPhaseTwo(
      repository,
      "private",
    );

  assert.equal(second.changed, 0);
  assert.equal(second.alreadyCorrect, 4);
  assert.equal(second.conflicts, 0);
  assert.equal(repository.saveCount, 1);
});

test("fails closed on an exact-title conflict", async () => {
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
    await migrateExplicitTaxonomyCorrectionsPhaseTwo(
      repository,
      "private",
    );

  assert.equal(result.changed, 0);
  assert.equal(result.conflicts, 1);
  assert.equal(repository.saveCount, 0);
  assert.equal(
    result.conflictDetails[0]?.reason,
    "title-mismatch",
  );
  assert.deepEqual(
    await repository.getAll(),
    discoveries,
  );
});

test("fails closed on an exact-source-path conflict", async () => {
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
    await migrateExplicitTaxonomyCorrectionsPhaseTwo(
      repository,
      "private",
    );

  assert.equal(result.changed, 0);
  assert.equal(result.conflicts, 1);
  assert.equal(repository.saveCount, 0);
  assert.equal(
    result.conflictDetails[0]?.reason,
    "source-path-mismatch",
  );
  assert.deepEqual(
    await repository.getAll(),
    discoveries,
  );
});

function createSourceDiscoveries(): Discovery[] {
  return EXPLICIT_TAXONOMY_CORRECTIONS_PHASE_TWO.map(
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
        `2026-08-10T00:00:0${index}.000Z`,
      updatedAt:
        `2026-08-10T00:00:0${index}.000Z`,
      savedAtLabel:
        "10.8.2026",
    }),
  );
}
