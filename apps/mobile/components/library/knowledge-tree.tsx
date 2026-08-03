import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import { KnowledgeTreeNode } from "@/components/library/knowledge-tree-node";
import { theme } from "@/theme";
import type { Discovery } from "@/types/discovery";
import type {
  KnowledgeGraph,
} from "@savewise/shared";

type KnowledgeTreeProps = {
  graph: KnowledgeGraph;

  discoveries: Discovery[];

  onOpenDiscovery: (
    discovery: Discovery,
  ) => void;
};

export function KnowledgeTree({
  graph,
  discoveries,
  onOpenDiscovery,
}: KnowledgeTreeProps) {
  const rootNodes =
    graph.rootNodeIds
      .map((rootNodeId) =>
        graph.nodes.find(
          (node) =>
            node.id === rootNodeId,
        ),
      )
      .filter(
        (
          node,
        ): node is KnowledgeGraph["nodes"][number] =>
          node !== undefined,
      );

  if (rootNodes.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>
          No knowledge structure yet
        </Text>

        <Text style={styles.emptyText}>
          Add more discoveries so
          SaveWise can build your
          personal knowledge graph.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {rootNodes.map((node) => (
        <KnowledgeTreeNode
          allNodes={graph.nodes}
          depth={0}
          discoveries={
            discoveries
          }
          initiallyExpanded
          key={node.id}
          node={node}
          onOpenDiscovery={
            onOpenDiscovery
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap:
      theme.spacing.sm,
  },

  emptyCard: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    padding:
      theme.spacing.lg,
  },

  emptyTitle: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,
  },

  emptyText: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.sm,
  },
});