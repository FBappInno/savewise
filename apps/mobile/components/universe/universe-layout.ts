import type {
  KnowledgeGraph,
  KnowledgeGraphNode,
} from "@savewise/shared";

import type {
  UniverseConnectionPlacement,
  UniverseNodePlacement,
  UniversePoint,
} from "@/components/universe/universe-types";

export type UniverseLayoutResult = {
  center: UniversePoint;
  nodes: UniverseNodePlacement[];
  connections: UniverseConnectionPlacement[];
};

type UniverseLayoutOptions = {
  worldWidth: number;
  worldHeight: number;
  expandedDomainId: string | null;
  expandedTopicId: string | null;
  maximumDomains?: number;
  maximumTopics?: number;
  maximumSubtopics?: number;
};

type DomainPlacement = {
  node: KnowledgeGraphNode;
  basePosition: UniversePoint;
  position: UniversePoint;
  domainIndex: number;
  radialAngle: number;
};

type TopicPlacement = {
  node: KnowledgeGraphNode;
  position: UniversePoint;
  topicIndex: number;
  radialAngle: number;
};

const DOMAIN_EXPANSION_SHIFT = 145;

const GENERIC_DOMAIN_LABELS =
  new Set([
    "other",
    "others",
    "general",
    "miscellaneous",
    "misc",
    "unknown",
    "uncategorized",
    "unclassified",
    "sonstiges",
    "andere",
    "allgemein",
    "noch nicht eingeordnet",
    "nicht eingeordnet",
  ]);

export function buildUniverseLayout(
  graph: KnowledgeGraph,
  {
    worldWidth,
    worldHeight,
    expandedDomainId,
    expandedTopicId,
    maximumDomains = 12,
    maximumTopics = 14,
    maximumSubtopics = 14,
  }: UniverseLayoutOptions,
): UniverseLayoutResult {
  const center: UniversePoint = {
    x: worldWidth / 2,
    y: worldHeight / 2,
  };

  const nodes:
    UniverseNodePlacement[] = [];

  const connections:
    UniverseConnectionPlacement[] = [];

  const domains =
    getDomains(graph).slice(
      0,
      maximumDomains,
    );

  const domainPlacements =
    createDomainPlacements(
      domains,
      center,
      worldWidth,
      worldHeight,
      expandedDomainId,
    );

  appendDomains(
    domainPlacements,
    center,
    expandedDomainId,
    nodes,
    connections,
  );

  if (!expandedDomainId) {
    return {
      center,
      nodes,
      connections,
    };
  }

  const activeDomain =
    domainPlacements.find(
      (placement) =>
        placement.node.id ===
        expandedDomainId,
    );

  if (!activeDomain) {
    return {
      center,
      nodes,
      connections,
    };
  }

  const topicPlacements =
    createTopicPlacements(
      graph,
      activeDomain,
      maximumTopics,
    );

  appendTopics(
    topicPlacements,
    activeDomain,
    expandedTopicId,
    nodes,
    connections,
  );

  if (!expandedTopicId) {
    return {
      center,
      nodes,
      connections,
    };
  }

  const activeTopic =
    topicPlacements.find(
      (placement) =>
        placement.node.id ===
        expandedTopicId,
    );

  if (!activeTopic) {
    return {
      center,
      nodes,
      connections,
    };
  }

  appendSubtopics(
    graph,
    activeDomain,
    activeTopic,
    maximumSubtopics,
    nodes,
    connections,
  );

  return {
    center,
    nodes,
    connections,
  };
}

function getDomains(
  graph: KnowledgeGraph,
): KnowledgeGraphNode[] {
  const nodesById =
    new Map(
      graph.nodes.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

  const configuredRoots =
    graph.rootNodeIds
      .map((id) =>
        nodesById.get(id),
      )
      .filter(
        (
          node,
        ): node is KnowledgeGraphNode =>
          Boolean(node),
      );

  const fallbackRoots =
    graph.nodes.filter(
      (node) =>
        node.parentId === null,
    );

  const roots =
    configuredRoots.length > 0
      ? configuredRoots
      : fallbackRoots;

  return roots
    .filter(
      (node) =>
        !isGenericDomain(
          node.title,
        ),
    )
    .sort(sortNodes);
}

function createDomainPlacements(
  domains: KnowledgeGraphNode[],
  center: UniversePoint,
  worldWidth: number,
  worldHeight: number,
  expandedDomainId: string | null,
): DomainPlacement[] {
  const horizontalRadius =
    Math.min(
      265,
      Math.max(
        195,
        worldWidth * 0.215,
      ),
    );

  const verticalRadius =
    Math.min(
      210,
      Math.max(
        165,
        worldHeight * 0.205,
      ),
    );

  return domains.map(
    (node, domainIndex) => {
      const radialAngle =
        -Math.PI / 2 +
        (
          Math.PI *
          2 *
          domainIndex
        ) /
          Math.max(
            domains.length,
            1,
          );

      const basePosition = {
        x:
          center.x +
          Math.cos(
            radialAngle,
          ) *
            horizontalRadius,

        y:
          center.y +
          Math.sin(
            radialAngle,
          ) *
            verticalRadius,
      };

      const isExpanded =
        node.id ===
        expandedDomainId;

      /*
       * Eine geöffnete Domäne wird entlang ihrer bisherigen
       * radialen Richtung weiter vom SaveWise-Kern entfernt.
       * Sie springt also nicht an eine fremde Position.
       */
      const position =
        isExpanded
          ? {
              x:
                basePosition.x +
                Math.cos(
                  radialAngle,
                ) *
                  DOMAIN_EXPANSION_SHIFT,

              y:
                basePosition.y +
                Math.sin(
                  radialAngle,
                ) *
                  DOMAIN_EXPANSION_SHIFT,
            }
          : basePosition;

      return {
        node,
        basePosition,
        position,
        domainIndex,
        radialAngle,
      };
    },
  );
}

function appendDomains(
  placements: DomainPlacement[],
  center: UniversePoint,
  expandedDomainId: string | null,
  nodes: UniverseNodePlacement[],
  connections:
    UniverseConnectionPlacement[],
): void {
  placements.forEach(
    (placement) => {
      nodes.push({
        node:
          placement.node,

        position:
          placement.position,

        level: "domain",

        domainIndex:
          placement.domainIndex,

        parentNodeId: null,

        isBackgroundNode:
          Boolean(
            expandedDomainId &&
              expandedDomainId !==
                placement.node.id,
          ),
      });

      connections.push({
        id:
          `center-${placement.node.id}`,

        from: center,

        to:
          placement.position,

        level: "domain",

        domainIndex:
          placement.domainIndex,
      });
    },
  );
}

function createTopicPlacements(
  graph: KnowledgeGraph,
  domain: DomainPlacement,
  maximum: number,
): TopicPlacement[] {
  const topics =
    getDirectChildren(
      graph,
      domain.node.id,
    )
      .filter(
        (node) =>
          node.kind === "topic" ||
          node.parentId ===
            domain.node.id,
      )
      .sort(sortNodes)
      .slice(0, maximum);

  const radius =
    topics.length <= 3
      ? 125
      : topics.length <= 6
        ? 155
        : topics.length <= 10
          ? 185
          : 215;

  /*
   * Topics werden auf einem nach außen gerichteten Fächer
   * angeordnet. Der Bereich zwischen Domäne und SaveWise bleibt
   * dadurch weitgehend frei.
   */
  const spread =
    topics.length <= 3
      ? Math.PI * 0.72
      : topics.length <= 7
        ? Math.PI * 1.05
        : Math.PI * 1.35;

  return topics.map(
    (node, topicIndex) => {
      const progress =
        topics.length === 1
          ? 0.5
          : topicIndex /
            Math.max(
              topics.length - 1,
              1,
            );

      const topicAngle =
        domain.radialAngle -
        spread / 2 +
        spread * progress;

      return {
        node,
        topicIndex,
        radialAngle:
          topicAngle,

        position: {
          x:
            domain.position.x +
            Math.cos(
              topicAngle,
            ) *
              radius,

          y:
            domain.position.y +
            Math.sin(
              topicAngle,
            ) *
              radius,
        },
      };
    },
  );
}

function appendTopics(
  placements: TopicPlacement[],
  domain: DomainPlacement,
  expandedTopicId: string | null,
  nodes: UniverseNodePlacement[],
  connections:
    UniverseConnectionPlacement[],
): void {
  placements.forEach(
    (placement) => {
      nodes.push({
        node:
          placement.node,

        position:
          placement.position,

        level: "topic",

        domainIndex:
          domain.domainIndex,

        parentNodeId:
          domain.node.id,

        isBackgroundNode:
          Boolean(
            expandedTopicId &&
              expandedTopicId !==
                placement.node.id,
          ),
      });

      connections.push({
        id:
          `${domain.node.id}-${placement.node.id}`,

        from:
          domain.position,

        to:
          placement.position,

        level: "topic",

        domainIndex:
          domain.domainIndex,
      });
    },
  );
}

function appendSubtopics(
  graph: KnowledgeGraph,
  domain: DomainPlacement,
  topic: TopicPlacement,
  maximum: number,
  nodes: UniverseNodePlacement[],
  connections:
    UniverseConnectionPlacement[],
): void {
  const subtopics =
    getDirectChildren(
      graph,
      topic.node.id,
    )
      .filter(
        (node) =>
          node.kind ===
            "subtopic" ||
          node.kind ===
            "concept" ||
          node.parentId ===
            topic.node.id,
      )
      .sort(sortNodes)
      .slice(0, maximum);

  const radius =
    subtopics.length <= 3
      ? 88
      : subtopics.length <= 7
        ? 112
        : 142;

  const spread =
    subtopics.length <= 3
      ? Math.PI * 0.68
      : subtopics.length <= 7
        ? Math.PI * 0.95
        : Math.PI * 1.18;

  subtopics.forEach(
    (
      node,
      subtopicIndex,
    ) => {
      const progress =
        subtopics.length === 1
          ? 0.5
          : subtopicIndex /
            Math.max(
              subtopics.length - 1,
              1,
            );

      const angle =
        topic.radialAngle -
        spread / 2 +
        spread * progress;

      const position = {
        x:
          topic.position.x +
          Math.cos(angle) *
            radius,

        y:
          topic.position.y +
          Math.sin(angle) *
            radius,
      };

      nodes.push({
        node,
        position,

        level:
          "subtopic",

        domainIndex:
          domain.domainIndex,

        parentNodeId:
          topic.node.id,

        isBackgroundNode:
          false,
      });

      connections.push({
        id:
          `${topic.node.id}-${node.id}`,

        from:
          topic.position,

        to:
          position,

        level:
          "subtopic",

        domainIndex:
          domain.domainIndex,
      });
    },
  );
}

function getDirectChildren(
  graph: KnowledgeGraph,
  parentId: string,
): KnowledgeGraphNode[] {
  return graph.nodes.filter(
    (node) =>
      node.parentId ===
      parentId,
  );
}

function isGenericDomain(
  value: string,
): boolean {
  return GENERIC_DOMAIN_LABELS.has(
    value
      .trim()
      .toLocaleLowerCase()
      .replace(
        /[\s_-]+/g,
        " ",
      ),
  );
}

function sortNodes(
  first: KnowledgeGraphNode,
  second: KnowledgeGraphNode,
): number {
  const discoveryDifference =
    second.discoveryIds.length -
    first.discoveryIds.length;

  if (
    discoveryDifference !== 0
  ) {
    return discoveryDifference;
  }

  const childDifference =
    second.childIds.length -
    first.childIds.length;

  if (
    childDifference !== 0
  ) {
    return childDifference;
  }

  return first.title.localeCompare(
    second.title,
    undefined,
    {
      sensitivity: "base",
    },
  );
}
