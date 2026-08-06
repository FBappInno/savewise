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

export function useUniverseLayout(
  graph: KnowledgeGraph,
  {
    width,
    height,
    expandedDomainId = null,
    expandedTopicId = null,
    maxDomains = 8,
    maxTopicsPerDomain = 8,
    maxSubtopicsPerTopic = 8,
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
      .filter(
        (node) =>
          node.kind === "domain" ||
          node.parentId === null,
      )
      .sort(sortByKnowledgeSize)
      .slice(0, maxDomains);

    const horizontalRadius =
      Math.max(
        118,
        Math.min(
          width * 0.33,
          188,
        ),
      );

    const verticalRadius =
      Math.max(
        158,
        Math.min(
          height * 0.31,
          228,
        ),
      );

    const layoutNodes:
      UniverseLayoutNode[] = [];

    const connections:
      UniverseLayoutConnection[] =
      [];

    const domainPositions =
      new Map<
        string,
        UniversePoint
      >();

    domains.forEach(
      (
        domain,
        rootIndex,
      ) => {
        const angle =
          -Math.PI / 2 +
          (Math.PI *
            2 *
            rootIndex) /
            Math.max(
              domains.length,
              1,
            );

        const position = {
          x:
            center.x +
            Math.cos(angle) *
              horizontalRadius,

          y:
            center.y +
            Math.sin(angle) *
              verticalRadius,
        };

        domainPositions.set(
          domain.id,
          position,
        );

        layoutNodes.push({
          node: domain,
          position,
          level: "domain",
          rootIndex,
          childIndex: -1,
          parentNodeId: null,
        });

        connections.push({
          id:
            `center-${domain.id}`,
          from: center,
          to: position,
          level: "domain",
          rootIndex,
        });
      },
    );

    if (!expandedDomainId) {
      return {
        center,
        nodes: layoutNodes,
        connections,
      };
    }

    const expandedDomain =
      nodesById.get(
        expandedDomainId,
      );

    const domainPosition =
      domainPositions.get(
        expandedDomainId,
      );

    if (
      !expandedDomain ||
      !domainPosition
    ) {
      return {
        center,
        nodes: layoutNodes,
        connections,
      };
    }

    const domainIndex =
      domains.findIndex(
        (domain) =>
          domain.id ===
          expandedDomainId,
      );

    const topics =
      getChildren(
        graph,
        expandedDomain.id,
      )
        .filter(
          (node) =>
            node.kind === "topic" ||
            node.kind ===
              "subtopic" ||
            node.parentId ===
              expandedDomain.id,
        )
        .sort(sortByKnowledgeSize)
        .slice(
          0,
          maxTopicsPerDomain,
        );

    const domainAngle =
      getAngle(
        center,
        domainPosition,
      );

    const topicRadius =
      width < 420
        ? 104
        : 122;

    const topicSpread =
      Math.min(
        Math.PI * 1.35,
        Math.PI * 0.65 +
          topics.length * 0.13,
      );

    const topicPositions =
      new Map<
        string,
        UniversePoint
      >();

    topics.forEach(
      (
        topic,
        topicIndex,
      ) => {
        const progress =
          topics.length === 1
            ? 0.5
            : topicIndex /
              Math.max(
                topics.length - 1,
                1,
              );

        const angle =
          domainAngle -
          topicSpread / 2 +
          topicSpread *
            progress;

        const position = {
          x: clamp(
            domainPosition.x +
              Math.cos(angle) *
                topicRadius,
            35,
            width - 35,
          ),

          y: clamp(
            domainPosition.y +
              Math.sin(angle) *
                topicRadius,
            55,
            height - 45,
          ),
        };

        topicPositions.set(
          topic.id,
          position,
        );

        layoutNodes.push({
          node: topic,
          position,
          level: "topic",
          rootIndex:
            domainIndex >= 0
              ? domainIndex
              : 0,
          childIndex:
            topicIndex,
          parentNodeId:
            expandedDomain.id,
        });

        connections.push({
          id:
            `${expandedDomain.id}-${topic.id}`,
          from:
            domainPosition,
          to: position,
          level: "topic",
          rootIndex:
            domainIndex >= 0
              ? domainIndex
              : 0,
        });
      },
    );

    if (!expandedTopicId) {
      return {
        center,
        nodes: layoutNodes,
        connections,
      };
    }

    const expandedTopic =
      nodesById.get(
        expandedTopicId,
      );

    const topicPosition =
      topicPositions.get(
        expandedTopicId,
      );

    if (
      !expandedTopic ||
      !topicPosition
    ) {
      return {
        center,
        nodes: layoutNodes,
        connections,
      };
    }

    const subtopics =
      getChildren(
        graph,
        expandedTopic.id,
      )
        .filter(
          (node) =>
            node.kind ===
              "subtopic" ||
            node.kind ===
              "concept" ||
            node.parentId ===
              expandedTopic.id,
        )
        .sort(sortByKnowledgeSize)
        .slice(
          0,
          maxSubtopicsPerTopic,
        );

    const topicAngle =
      getAngle(
        domainPosition,
        topicPosition,
      );

    const subtopicRadius =
      width < 420
        ? 72
        : 88;

    const subtopicSpread =
      Math.min(
        Math.PI * 1.15,
        Math.PI * 0.5 +
          subtopics.length *
            0.12,
      );

    subtopics.forEach(
      (
        subtopic,
        subtopicIndex,
      ) => {
        const progress =
          subtopics.length === 1
            ? 0.5
            : subtopicIndex /
              Math.max(
                subtopics.length -
                  1,
                1,
              );

        const angle =
          topicAngle -
          subtopicSpread / 2 +
          subtopicSpread *
            progress;

        const position = {
          x: clamp(
            topicPosition.x +
              Math.cos(angle) *
                subtopicRadius,
            28,
            width - 28,
          ),

          y: clamp(
            topicPosition.y +
              Math.sin(angle) *
                subtopicRadius,
            45,
            height - 38,
          ),
        };

        layoutNodes.push({
          node: subtopic,
          position,
          level: "subtopic",
          rootIndex:
            domainIndex >= 0
              ? domainIndex
              : 0,
          childIndex:
            subtopicIndex,
          parentNodeId:
            expandedTopic.id,
        });

        connections.push({
          id:
            `${expandedTopic.id}-${subtopic.id}`,
          from:
            topicPosition,
          to: position,
          level: "subtopic",
          rootIndex:
            domainIndex >= 0
              ? domainIndex
              : 0,
        });
      },
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

function getChildren(
  graph: KnowledgeGraph,
  parentId: string,
): KnowledgeGraphNode[] {
  const parent =
    graph.nodes.find(
      (node) =>
        node.id === parentId,
    );

  const childIds =
    new Set(
      parent?.childIds ?? [],
    );

  return graph.nodes.filter(
    (node) =>
      node.parentId ===
        parentId ||
      childIds.has(node.id),
  );
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

function getAngle(
  from: UniversePoint,
  to: UniversePoint,
): number {
  return Math.atan2(
    to.y - from.y,
    to.x - from.x,
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}