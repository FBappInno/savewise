import { useMemo } from "react";

import type {
  KnowledgeGraph,
  KnowledgeGraphNode,
} from "@savewise/shared";

export type UniversePoint = {
  x: number;
  y: number;
};

export type UniverseLayoutNode = {
  node: KnowledgeGraphNode;
  position: UniversePoint;
  level: "root" | "child";
  rootIndex: number;
  childIndex: number;
};

export type UniverseLayoutConnection = {
  id: string;
  from: UniversePoint;
  to: UniversePoint;
  level: "root" | "child";
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
  maxRoots?: number;
  maxChildrenPerRoot?: number;
};

export function useUniverseLayout(
  graph: KnowledgeGraph,
  {
    width,
    height,
    maxRoots = 8,
    maxChildrenPerRoot = 5,
  }: Options,
): UniverseLayout {
  return useMemo(() => {
    const center = {
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
        (node) => node.parentId === null,
      );

    const roots = (
      rootCandidates.length > 0
        ? rootCandidates
        : fallbackRoots
    )
      .sort(
        (first, second) =>
          second.discoveryIds.length -
          first.discoveryIds.length,
      )
      .slice(0, maxRoots);

    const horizontalRadius = Math.max(
      120,
      Math.min(width * 0.34, 190),
    );

    const verticalRadius = Math.max(
      150,
      Math.min(height * 0.31, 230),
    );

    const layoutNodes: UniverseLayoutNode[] = [];
    const connections: UniverseLayoutConnection[] = [];

    roots.forEach((root, rootIndex) => {
      const angle =
        -Math.PI / 2 +
        (Math.PI * 2 * rootIndex) /
          Math.max(roots.length, 1);

      const rootPosition = {
        x:
          center.x +
          Math.cos(angle) *
            horizontalRadius,

        y:
          center.y +
          Math.sin(angle) *
            verticalRadius,
      };

      layoutNodes.push({
        node: root,
        position: rootPosition,
        level: "root",
        rootIndex,
        childIndex: -1,
      });

      connections.push({
        id: `center-${root.id}`,
        from: center,
        to: rootPosition,
        level: "root",
        rootIndex,
      });

      const children = graph.nodes
        .filter(
          (node) =>
            node.parentId === root.id,
        )
        .sort(
          (first, second) =>
            second.discoveryIds.length -
            first.discoveryIds.length,
        )
        .slice(0, maxChildrenPerRoot);

      const childRadius =
        width < 420 ? 58 : 76;

      const childSpread =
        Math.min(
          Math.PI * 0.9,
          Math.PI * 0.3 +
            children.length * 0.14,
        );

      children.forEach(
        (child, childIndex) => {
          const progress =
            children.length === 1
              ? 0.5
              : childIndex /
                Math.max(
                  children.length - 1,
                  1,
                );

          const childAngle =
            angle -
            childSpread / 2 +
            childSpread * progress;

          const childPosition = {
            x:
              rootPosition.x +
              Math.cos(childAngle) *
                childRadius,

            y:
              rootPosition.y +
              Math.sin(childAngle) *
                childRadius,
          };

          layoutNodes.push({
            node: child,
            position: childPosition,
            level: "child",
            rootIndex,
            childIndex,
          });

          connections.push({
            id: `${root.id}-${child.id}`,
            from: rootPosition,
            to: childPosition,
            level: "child",
            rootIndex,
          });
        },
      );
    });

    return {
      center,
      nodes: layoutNodes,
      connections,
    };
  }, [
    graph,
    height,
    maxChildrenPerRoot,
    maxRoots,
    width,
  ]);
}