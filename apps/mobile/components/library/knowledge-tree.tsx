import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DiscoveryCard } from "@/components/discovery-card";
import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";
import type { Discovery } from "@/types/discovery";
import type {
  KnowledgeGraph,
  KnowledgeGraphNode,
} from "@savewise/shared";
import { trackAnonymousEvent } from "@/services/anonymous-analytics";

type KnowledgeTreeProps = {
  graph: KnowledgeGraph;
  discoveries: Discovery[];
  onOpenDiscovery: (discovery: Discovery) => void;
};

export function KnowledgeTree({
  graph,
  discoveries,
  onOpenDiscovery,
}: KnowledgeTreeProps) {
  const { t } = useAppSettings();
  const [path, setPath] = useState<string[]>([]);

  const nodesById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );

  useEffect(() => {
    setPath((currentPath) =>
      currentPath.every((nodeId) => nodesById.has(nodeId))
        ? currentPath
        : [],
    );
  }, [nodesById]);

  const activeNode = path.length > 0
    ? nodesById.get(path[path.length - 1])
    : undefined;

  const visibleNodes = (activeNode?.childIds ?? graph.rootNodeIds)
    .map((nodeId) => nodesById.get(nodeId))
    .filter((node): node is KnowledgeGraphNode => node !== undefined)
    .sort((left, right) =>
      countDiscoveries(right, nodesById) - countDiscoveries(left, nodesById),
    );

  const leafDiscoveries = activeNode && visibleNodes.length === 0
    ? collectDiscoveries(activeNode, nodesById, discoveries)
    : [];

  if (graph.rootNodeIds.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>{t("library.emptyTree")}</Text>
        <Text style={styles.emptyText}>{t("library.emptyTreeText")}</Text>
      </View>
    );
  }

  function openNode(nodeId: string) {
    void trackAnonymousEvent("TopicOpened", { operation: "library" });
    setPath((currentPath) => [...currentPath, nodeId]);
  }

  function openPathLevel(index: number) {
    setPath((currentPath) => currentPath.slice(0, index + 1));
  }

  function goBack() {
    setPath((currentPath) => currentPath.slice(0, -1));
  }

  return (
    <View style={styles.container}>
      <View style={styles.navigationHeader}>
        {path.length > 0 ? (
          <Pressable
            accessibilityLabel={t("library.backOneLevel")}
            accessibilityRole="button"
            hitSlop={10}
            onPress={goBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={theme.colors.primary}
              name="arrow-back"
              size={18}
            />
            <Text style={styles.backText}>{t("navigation.back")}</Text>
          </Pressable>
        ) : (
          <Text style={styles.levelLabel}>{t("library.topLevel")}</Text>
        )}

        <Text style={styles.levelCount}>
          {visibleNodes.length > 0
            ? `${visibleNodes.length} ${t("library.groups")}`
            : `${leafDiscoveries.length} ${t("library.entries")}`}
        </Text>
      </View>

      {path.length > 0 ? (
        <View style={styles.breadcrumbs}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPath([])}
          >
            <Text style={styles.breadcrumbText}>{t("library.allTopics")}</Text>
          </Pressable>

          {path.map((nodeId, index) => {
            const node = nodesById.get(nodeId);
            if (!node) return null;

            return (
              <View key={nodeId} style={styles.breadcrumbItem}>
                <Ionicons
                  color={theme.colors.placeholder}
                  name="chevron-forward"
                  size={13}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={index === path.length - 1}
                  onPress={() => openPathLevel(index)}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.breadcrumbText,
                      index === path.length - 1 && styles.activeBreadcrumb,
                    ]}
                  >
                    {formatNodeTitle(node.title)}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {visibleNodes.length > 0 ? (
        <View style={styles.treeLevel}>
          <View style={styles.nodeGrid}>
            {visibleNodes.map((node) => (
              <View key={node.id} style={styles.nodeWrapper}>
                <View style={styles.branchStem} />
                <Pressable
                  accessibilityLabel={`${node.title}, ${countDiscoveries(node, nodesById)} ${t("library.entries")}`}
                  accessibilityRole="button"
                  onPress={() => openNode(node.id)}
                  style={({ pressed }) => [
                    styles.nodeCard,
                    pressed && styles.nodeCardPressed,
                  ]}
                >
                  <Text
                    numberOfLines={6}
                    style={styles.nodeTitle}
                  >
                    {formatNodeTitle(node.title)}
                  </Text>
                  <Text style={styles.discoveryCount}>
                    {countDiscoveries(node, nodesById)}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {activeNode && visibleNodes.length === 0 ? (
        <View style={styles.leafSection}>
          <View style={styles.leafHeader}>
            <View style={styles.leafDot} />
            <Text style={styles.leafTitle}>{activeNode.title}</Text>
          </View>

          <View style={styles.discoveryList}>
            {leafDiscoveries.map((discovery) => (
              <DiscoveryCard
                discovery={discovery}
                key={discovery.id}
                onPress={onOpenDiscovery}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function formatNodeTitle(value: string): string {
  return value
    .replace(/-/g, "-\u200B")
    .split(/(\s+)/)
    .map((part) => part.length > 18 ? insertSoftBreaks(part) : part)
    .join("");
}

function insertSoftBreaks(value: string): string {
  return value.match(/.{1,12}/gu)?.join("\u00ad") ?? value;
}

function collectDiscoveryIds(
  node: KnowledgeGraphNode,
  nodesById: Map<string, KnowledgeGraphNode>,
  visited = new Set<string>(),
): Set<string> {
  if (visited.has(node.id)) return new Set();
  visited.add(node.id);

  const discoveryIds = new Set(node.discoveryIds);
  for (const childId of node.childIds) {
    const child = nodesById.get(childId);
    if (!child) continue;
    for (const discoveryId of collectDiscoveryIds(child, nodesById, visited)) {
      discoveryIds.add(discoveryId);
    }
  }

  return discoveryIds;
}

function countDiscoveries(
  node: KnowledgeGraphNode,
  nodesById: Map<string, KnowledgeGraphNode>,
): number {
  return collectDiscoveryIds(node, nodesById).size;
}

function collectDiscoveries(
  node: KnowledgeGraphNode,
  nodesById: Map<string, KnowledgeGraphNode>,
  discoveries: Discovery[],
): Discovery[] {
  const discoveryIds = collectDiscoveryIds(node, nodesById);
  return discoveries.filter((discovery) => discoveryIds.has(discovery.id));
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.md },
  navigationHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 32,
  },
  backButton: { alignItems: "center", flexDirection: "row", gap: 6 },
  backText: { ...theme.typography.body, color: theme.colors.primary, fontWeight: "700" },
  levelLabel: { ...theme.typography.body, color: theme.colors.text, fontWeight: "700" },
  levelCount: { ...theme.typography.caption, color: theme.colors.textSecondary },
  breadcrumbs: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    paddingVertical: theme.spacing.xs,
  },
  breadcrumbItem: { alignItems: "center", flexDirection: "row", gap: 3, maxWidth: "70%" },
  breadcrumbText: { ...theme.typography.caption, color: theme.colors.primary },
  activeBreadcrumb: { color: theme.colors.text, fontWeight: "700" },
  treeLevel: { paddingTop: theme.spacing.xs, position: "relative" },
  nodeGrid: { borderLeftColor: theme.colors.border, borderLeftWidth: 2, gap: theme.spacing.sm },
  nodeWrapper: { paddingLeft: 28, position: "relative", width: "100%" },
  branchStem: {
    backgroundColor: theme.colors.border,
    height: 2,
    left: 0,
    position: "absolute",
    top: 43,
    width: 28,
  },
  nodeCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 86,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  nodeCardPressed: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.primary,
    transform: [{ scale: 0.98 }],
  },
  nodeTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: "700",
    flexShrink: 1,
    lineHeight: 22,
    textAlign: "center",
  },
  discoveryCount: {
    ...theme.typography.sectionTitle,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  leafSection: { gap: theme.spacing.md },
  leafHeader: { alignItems: "center", flexDirection: "row", gap: theme.spacing.sm },
  leafDot: { backgroundColor: theme.colors.primary, borderRadius: 99, height: 10, width: 10 },
  leafTitle: { ...theme.typography.sectionTitle, color: theme.colors.text, flex: 1 },
  discoveryList: { gap: theme.spacing.md },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  emptyTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
  emptyText: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  pressed: { opacity: 0.65 },
});
