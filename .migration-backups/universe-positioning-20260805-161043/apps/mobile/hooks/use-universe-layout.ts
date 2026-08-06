
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
        .map((id) => nodesById.get(id))
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

    if (!expandedDomainId) {
      return createOverviewLayout(
        domains,
        center,
        width,
        height,
      );
    }

    const expandedDomain =
      domains.find(
        (domain) =>
          domain.id ===
          expandedDomainId,
      ) ?? null;

    if (!expandedDomain) {
      return createOverviewLayout(
        domains,
        center,
        width,
        height,
      );
    }

    const domainIndex =
      domains.findIndex(
        (domain) =>
          domain.id ===
          expandedDomain.id,
      );

    if (!expandedTopicId) {
      return createDomainFocusLayout(
        graph,
        domains,
        expandedDomain,
        domainIndex,
        center,
        width,
        height,
        maxTopicsPerDomain,
      );
    }

    const expandedTopic =
      graph.nodes.find(
        (node) =>
          node.id ===
            expandedTopicId &&
          node.parentId ===
            expandedDomain.id,
      ) ?? null;

    if (!expandedTopic) {
      return createDomainFocusLayout(
        graph,
        domains,
        expandedDomain,
        domainIndex,
        center,
        width,
        height,
        maxTopicsPerDomain,
      );
    }

    return createTopicFocusLayout(
      graph,
      domains,
      expandedDomain,
      expandedTopic,
      domainIndex,
      center,
      width,
      height,
      maxSubtopicsPerTopic,
    );
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

function createOverviewLayout(
  domains: KnowledgeGraphNode[],
  center: UniversePoint,
  width: number,
  height: number,
): UniverseLayout {
  const nodes: UniverseLayoutNode[] = [];
  const connections:
    UniverseLayoutConnection[] = [];

  const horizontalRadius =
    Math.max(
      230,
      Math.min(
        width * 0.33,
        390,
      ),
    );

  const verticalRadius =
    Math.max(
      220,
      Math.min(
        height * 0.31,
        330,
      ),
    );

  domains.forEach(
    (domain, rootIndex) => {
      const angle =
        -Math.PI / 2 +
        (Math.PI * 2 * rootIndex) /
          Math.max(domains.length, 1);

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

      nodes.push({
        node: domain,
        position,
        level: "domain",
        rootIndex,
        childIndex: -1,
        parentNodeId: null,
        isBackgroundNode: false,
      });

      connections.push({
        id: `center-${domain.id}`,
        from: center,
        to: position,
        level: "domain",
        rootIndex,
      });
    },
  );

  return {
    center,
    nodes,
    connections,
  };
}

function createDomainFocusLayout(
  graph: KnowledgeGraph,
  domains: KnowledgeGraphNode[],
  domain: KnowledgeGraphNode,
  domainIndex: number,
  center: UniversePoint,
  width: number,
  height: number,
  maxTopics: number,
): UniverseLayout {
  const nodes: UniverseLayoutNode[] = [];
  const connections:
    UniverseLayoutConnection[] = [];

  nodes.push({
    node: domain,
    position: center,
    level: "domain",
    rootIndex: domainIndex,
    childIndex: -1,
    parentNodeId: null,
    isBackgroundNode: false,
  });

  const topics =
    getDirectChildren(
      graph,
      domain.id,
    )
      .filter(
        (node) =>
          node.kind === "topic",
      )
      .sort(sortByKnowledgeSize)
      .slice(0, maxTopics);

  const columns =
    topics.length <= 6
      ? 3
      : topics.length <= 10
        ? 4
        : 5;

  const horizontalSpacing =
    width < 900 ? 175 : 210;

  const verticalSpacing =
    height < 800 ? 145 : 170;

  topics.forEach(
    (topic, topicIndex) => {
      const position =
        createGridOrbitPosition(
          center,
          topicIndex,
          topics.length,
          columns,
          horizontalSpacing,
          verticalSpacing,
        );

      nodes.push({
        node: topic,
        position,
        level: "topic",
        rootIndex: domainIndex,
        childIndex: topicIndex,
        parentNodeId: domain.id,
        isBackgroundNode: false,
      });

      connections.push({
        id:
          `${domain.id}-${topic.id}`,
        from: center,
        to: position,
        level: "topic",
        rootIndex: domainIndex,
      });
    },
  );

  appendBackgroundDomains(
    nodes,
    domains,
    domain,
    center,
    width,
    height,
  );

  return {
    center,
    nodes,
    connections,
  };
}

function createTopicFocusLayout(
  graph: KnowledgeGraph,
  domains: KnowledgeGraphNode[],
  domain: KnowledgeGraphNode,
  topic: KnowledgeGraphNode,
  domainIndex: number,
  center: UniversePoint,
  width: number,
  height: number,
  maxSubtopics: number,
): UniverseLayout {
  const nodes: UniverseLayoutNode[] = [];
  const connections:
    UniverseLayoutConnection[] = [];

  const domainPosition = {
    x:
      center.x -
      Math.min(290, width * 0.25),

    y: center.y,
  };

  const topicPosition = center;

  nodes.push({
    node: domain,
    position: domainPosition,
    level: "domain",
    rootIndex: domainIndex,
    childIndex: -1,
    parentNodeId: null,
    isBackgroundNode: true,
  });

  nodes.push({
    node: topic,
    position: topicPosition,
    level: "topic",
    rootIndex: domainIndex,
    childIndex: 0,
    parentNodeId: domain.id,
    isBackgroundNode: false,
  });

  connections.push({
    id:
      `${domain.id}-${topic.id}`,
    from: domainPosition,
    to: topicPosition,
    level: "topic",
    rootIndex: domainIndex,
  });

  const subtopics =
    getDirectChildren(
      graph,
      topic.id,
    )
      .filter(
        (node) =>
          node.kind === "subtopic" ||
          node.kind === "concept",
      )
      .sort(sortByKnowledgeSize)
      .slice(0, maxSubtopics);

  const columns =
    subtopics.length <= 6
      ? 3
      : subtopics.length <= 10
        ? 4
        : 5;

  const horizontalSpacing =
    width < 900 ? 160 : 195;

  const verticalSpacing =
    height < 800 ? 130 : 155;

  subtopics.forEach(
    (
      subtopic,
      subtopicIndex,
    ) => {
      const position =
        createGridOrbitPosition(
          topicPosition,
          subtopicIndex,
          subtopics.length,
          columns,
          horizontalSpacing,
          verticalSpacing,
        );

      nodes.push({
        node: subtopic,
        position,
        level: "subtopic",
        rootIndex: domainIndex,
        childIndex:
          subtopicIndex,
        parentNodeId: topic.id,
        isBackgroundNode: false,
      });

      connections.push({
        id:
          `${topic.id}-${subtopic.id}`,
        from: topicPosition,
        to: position,
        level: "subtopic",
        rootIndex: domainIndex,
      });
    },
  );

  appendBackgroundDomains(
    nodes,
    domains,
    domain,
    center,
    width,
    height,
  );

  return {
    center,
    nodes,
    connections,
  };
}

function appendBackgroundDomains(
  nodes: UniverseLayoutNode[],
  domains: KnowledgeGraphNode[],
  focusedDomain: KnowledgeGraphNode,
  center: UniversePoint,
  width: number,
  height: number,
): void {
  const otherDomains =
    domains.filter(
      (domain) =>
        domain.id !==
        focusedDomain.id,
    );

  const radiusX =
    Math.max(
      390,
      width * 0.39,
    );

  const radiusY =
    Math.max(
      300,
      height * 0.37,
    );

  otherDomains.forEach(
    (domain, index) => {
      const angle =
        -Math.PI / 2 +
        (Math.PI * 2 * index) /
          Math.max(
            otherDomains.length,
            1,
          );

      nodes.push({
        node: domain,

        position: {
          x:
            center.x +
            Math.cos(angle) *
              radiusX,

          y:
            center.y +
            Math.sin(angle) *
              radiusY,
        },

        level: "domain",
        rootIndex:
          domains.findIndex(
            (candidate) =>
              candidate.id ===
              domain.id,
          ),
        childIndex: -1,
        parentNodeId: null,
        isBackgroundNode: true,
      });
    },
  );
}

function createGridOrbitPosition(
  center: UniversePoint,
  index: number,
  total: number,
  columns: number,
  horizontalSpacing: number,
  verticalSpacing: number,
): UniversePoint {
  const effectiveColumns =
    Math.max(
      1,
      Math.min(columns, total),
    );

  const row =
    Math.floor(
      index / effectiveColumns,
    );

  const column =
    index % effectiveColumns;

  const rows =
    Math.ceil(
      total /
        effectiveColumns,
    );

  const columnsInRow =
    Math.min(
      effectiveColumns,
      total -
        row *
          effectiveColumns,
    );

  const xOffset =
    (
      column -
      (columnsInRow - 1) / 2
    ) *
    horizontalSpacing;

  const yOffset =
    (
      row -
      (rows - 1) / 2
    ) *
    verticalSpacing;

  const centerClearance =
    Math.abs(xOffset) < 100 &&
    Math.abs(yOffset) < 80;

  if (!centerClearance) {
    return {
      x:
        center.x +
        xOffset,

      y:
        center.y +
        yOffset,
    };
  }

  return {
    x:
      center.x +
      xOffset +
      horizontalSpacing,

    y:
      center.y +
      yOffset,
  };
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

  if (childDifference !== 0) {
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
