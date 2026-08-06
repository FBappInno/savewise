import { useMemo } from "react";

import type {
  KnowledgeGraph,
  KnowledgeGraphNode,
} from "@savewise/shared";

export type UniversePoint = {
  x: number;
  y: number;
};

export type UniverseLayoutLevel =
  | "domain"
  | "topic"
  | "subtopic";

export type UniverseLayoutNode = {
  node: KnowledgeGraphNode;
  position: UniversePoint;
  level: UniverseLayoutLevel;
  rootIndex: number;
  childIndex: number;
  parentNodeId: string | null;
  isBackgroundNode: boolean;
};

export type UniverseLayoutConnection = {
  id: string;
  from: UniversePoint;
  to: UniversePoint;
  level: UniverseLayoutLevel;
  rootIndex: number;
};

type UniverseLayout = {
  center: UniversePoint;
  nodes: UniverseLayoutNode[];
  connections: UniverseLayoutConnection[];
};

type Options = {
  width: number;
  height: number;
  expandedDomainId?: string | null;
  expandedTopicId?: string | null;
  maxDomains?: number;
  maxTopicsPerDomain?: number;
  maxSubtopicsPerTopic?: number;
};

type DomainPlacement = {
  domain: KnowledgeGraphNode;
  position: UniversePoint;
  rootIndex: number;
};

type TopicPlacement = {
  topic: KnowledgeGraphNode;
  position: UniversePoint;
  topicIndex: number;
};

export function useUniverseLayout(
  graph: KnowledgeGraph,
  {
    width,
    height,
    expandedDomainId = null,
    expandedTopicId = null,
    maxDomains = 12,
    maxTopicsPerDomain = 14,
    maxSubtopicsPerTopic = 14,
  }: Options,
): UniverseLayout {
  return useMemo(() => {
    const center: UniversePoint = {
      x: width / 2,
      y: height / 2,
    };

    const nodesById = new Map(
      graph.nodes.map((node) => [
        node.id,
        node,
      ]),
    );

    const rootCandidates =
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

    const domains = (
      rootCandidates.length > 0
        ? rootCandidates
        : fallbackRoots
    )
      .filter(isVisibleDomain)
      .sort(sortByKnowledgeSize)
      .slice(0, maxDomains);

    const domainPlacements =
      createDomainPlacements(
        domains,
        center,
        width,
        height,
      );

    const layoutNodes:
      UniverseLayoutNode[] = [];

    const connections:
      UniverseLayoutConnection[] = [];

    appendDomains(
      domainPlacements,
      center,
      expandedDomainId,
      layoutNodes,
      connections,
    );

    if (!expandedDomainId) {
      return {
        center,
        nodes: layoutNodes,
        connections,
      };
    }

    const selectedDomainPlacement =
      domainPlacements.find(
        (placement) =>
          placement.domain.id ===
          expandedDomainId,
      );

    if (!selectedDomainPlacement) {
      return {
        center,
        nodes: layoutNodes,
        connections,
      };
    }

    const topicPlacements =
      createTopicPlacements(
        graph,
        selectedDomainPlacement,
        maxTopicsPerDomain,
      );

    appendTopics(
      topicPlacements,
      selectedDomainPlacement,
      expandedTopicId,
      layoutNodes,
      connections,
    );

    if (!expandedTopicId) {
      return {
        center,
        nodes: layoutNodes,
        connections,
      };
    }

    const selectedTopicPlacement =
      topicPlacements.find(
        (placement) =>
          placement.topic.id ===
          expandedTopicId,
      );

    if (!selectedTopicPlacement) {
      return {
        center,
        nodes: layoutNodes,
        connections,
      };
    }

    appendSubtopics(
      graph,
      selectedDomainPlacement,
      selectedTopicPlacement,
      maxSubtopicsPerTopic,
      layoutNodes,
      connections,
    );

    return {
      center,
      nodes: layoutNodes,
      connections,
    };
  }, [
    expandedDomainId,
    expandedTopicId,
    graph,
    height,
    maxDomains,
    maxSubtopicsPerTopic,
    maxTopicsPerDomain,
    width,
  ]);
}

function createDomainPlacements(
  domains: KnowledgeGraphNode[],
  center: UniversePoint,
  width: number,
  height: number,
): DomainPlacement[] {
  /*
   * Die Domänen liegen bewusst näher an SaveWise.
   * Da die Karte verschiebbar ist, benötigen wir keinen
   * übermäßig großen Abstand mehr.
   */
  const horizontalRadius =
    Math.max(
      205,
      Math.min(
        width * 0.235,
        278,
      ),
    );

  const verticalRadius =
    Math.max(
      175,
      Math.min(
        height * 0.225,
        220,
      ),
    );

  return domains.map(
    (domain, rootIndex) => {
      const angle =
        -Math.PI / 2 +
        (
          Math.PI *
          2 *
          rootIndex
        ) /
          Math.max(
            domains.length,
            1,
          );

      return {
        domain,
        rootIndex,

        position: {
          x:
            center.x +
            Math.cos(angle) *
              horizontalRadius,

          y:
            center.y +
            Math.sin(angle) *
              verticalRadius,
        },
      };
    },
  );
}

function appendDomains(
  placements: DomainPlacement[],
  center: UniversePoint,
  expandedDomainId: string | null,
  nodes: UniverseLayoutNode[],
  connections: UniverseLayoutConnection[],
): void {
  placements.forEach(
    (placement) => {
      const isBackgroundNode =
        expandedDomainId !== null &&
        placement.domain.id !==
          expandedDomainId;

      nodes.push({
        node:
          placement.domain,

        position:
          placement.position,

        level: "domain",

        rootIndex:
          placement.rootIndex,

        childIndex: -1,

        parentNodeId: null,

        isBackgroundNode,
      });

      connections.push({
        id:
          `center-${placement.domain.id}`,

        from: center,

        to:
          placement.position,

        level: "domain",

        rootIndex:
          placement.rootIndex,
      });
    },
  );
}

function createTopicPlacements(
  graph: KnowledgeGraph,
  domainPlacement: DomainPlacement,
  maximum: number,
): TopicPlacement[] {
  const topics =
    getDirectChildren(
      graph,
      domainPlacement.domain.id,
    )
      .filter(
        (node) =>
          node.kind === "topic",
      )
      .sort(sortByKnowledgeSize)
      .slice(0, maximum);

  const topicRadius =
    topics.length <= 4
      ? 128
      : topics.length <= 8
        ? 155
        : 185;

  /*
   * Die Topics werden vollständig um die ursprüngliche
   * Position der Domäne angeordnet.
   */
  return topics.map(
    (topic, topicIndex) => {
      const angle =
        -Math.PI / 2 +
        (
          Math.PI *
          2 *
          topicIndex
        ) /
          Math.max(
            topics.length,
            1,
          );

      return {
        topic,
        topicIndex,

        position: {
          x:
            domainPlacement.position.x +
            Math.cos(angle) *
              topicRadius,

          y:
            domainPlacement.position.y +
            Math.sin(angle) *
              topicRadius,
        },
      };
    },
  );
}

function appendTopics(
  placements: TopicPlacement[],
  domainPlacement: DomainPlacement,
  expandedTopicId: string | null,
  nodes: UniverseLayoutNode[],
  connections: UniverseLayoutConnection[],
): void {
  placements.forEach(
    (placement) => {
      const isBackgroundNode =
        expandedTopicId !== null &&
        placement.topic.id !==
          expandedTopicId;

      nodes.push({
        node:
          placement.topic,

        position:
          placement.position,

        level: "topic",

        rootIndex:
          domainPlacement.rootIndex,

        childIndex:
          placement.topicIndex,

        parentNodeId:
          domainPlacement.domain.id,

        isBackgroundNode,
      });

      connections.push({
        id:
          `${domainPlacement.domain.id}-${placement.topic.id}`,

        from:
          domainPlacement.position,

        to:
          placement.position,

        level: "topic",

        rootIndex:
          domainPlacement.rootIndex,
      });
    },
  );
}

function appendSubtopics(
  graph: KnowledgeGraph,
  domainPlacement: DomainPlacement,
  topicPlacement: TopicPlacement,
  maximum: number,
  nodes: UniverseLayoutNode[],
  connections: UniverseLayoutConnection[],
): void {
  const subtopics =
    getDirectChildren(
      graph,
      topicPlacement.topic.id,
    )
      .filter(
        (node) =>
          node.kind === "subtopic" ||
          node.kind === "concept",
      )
      .sort(sortByKnowledgeSize)
      .slice(0, maximum);

  const subtopicRadius =
    subtopics.length <= 4
      ? 88
      : subtopics.length <= 8
        ? 110
        : 136;

  subtopics.forEach(
    (
      subtopic,
      subtopicIndex,
    ) => {
      const angle =
        -Math.PI / 2 +
        (
          Math.PI *
          2 *
          subtopicIndex
        ) /
          Math.max(
            subtopics.length,
            1,
          );

      const position = {
        x:
          topicPlacement.position.x +
          Math.cos(angle) *
            subtopicRadius,

        y:
          topicPlacement.position.y +
          Math.sin(angle) *
            subtopicRadius,
      };

      nodes.push({
        node: subtopic,

        position,

        level: "subtopic",

        rootIndex:
          domainPlacement.rootIndex,

        childIndex:
          subtopicIndex,

        parentNodeId:
          topicPlacement.topic.id,

        isBackgroundNode: false,
      });

      connections.push({
        id:
          `${topicPlacement.topic.id}-${subtopic.id}`,

        from:
          topicPlacement.position,

        to: position,

        level: "subtopic",

        rootIndex:
          domainPlacement.rootIndex,
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
      node.parentId === parentId,
  );
}

function isVisibleDomain(
  node: KnowledgeGraphNode,
): boolean {
  if (
    node.kind !== "domain" &&
    node.parentId !== null
  ) {
    return false;
  }

  return !isGenericLabel(
    node.title,
  );
}

function isGenericLabel(
  value: string,
): boolean {
  const normalized =
    value
      .trim()
      .toLocaleLowerCase()
      .replace(
        /[\s_-]+/g,
        " ",
      );

  return [
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
  ].includes(normalized);
}

function sortByKnowledgeSize(
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
