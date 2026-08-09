import { Ionicons } from "@expo/vector-icons";
import {
  useMemo,
  useState,
} from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DiscoveryCard } from "@/components/discovery-card";
import { theme } from "@/theme";
import type { Discovery } from "@/types/discovery";
import type {
  KnowledgeGraphNode,
} from "@savewise/shared";

type KnowledgeTreeNodeProps = {
  node: KnowledgeGraphNode;

  allNodes: KnowledgeGraphNode[];

  discoveries: Discovery[];

  depth: number;

  initiallyExpanded?: boolean;

  onOpenDiscovery: (
    discovery: Discovery,
  ) => void;
};

export function KnowledgeTreeNode({
  node,
  allNodes,
  discoveries,
  depth,
  initiallyExpanded = false,
  onOpenDiscovery,
}: KnowledgeTreeNodeProps) {
  const [
    isExpanded,
    setIsExpanded,
  ] = useState(
    initiallyExpanded,
  );

  const children = useMemo(
    () =>
      node.childIds
        .map((childId) =>
          allNodes.find(
            (candidate) =>
              candidate.id === childId,
          ),
        )
        .filter(
          (
            candidate,
          ): candidate is KnowledgeGraphNode =>
            candidate !== undefined,
        ),
    [
      allNodes,
      node.childIds,
    ],
  );

  const directDiscoveryIds =
    useMemo(() => {
      if (children.length > 0) {
        return [];
      }

      return node.discoveryIds;
    }, [
      children,
      node.discoveryIds,
    ]);

  const directDiscoveries =
    useMemo(
      () =>
        directDiscoveryIds
          .map((discoveryId) =>
            discoveries.find(
              (discovery) =>
                discovery.id ===
                discoveryId,
            ),
          )
          .filter(
            (
              discovery,
            ): discovery is Discovery =>
              discovery !== undefined,
          ),
      [
        directDiscoveryIds,
        discoveries,
      ],
    );

  const canExpand = true;

  function toggleExpanded() {
    if (!canExpand) {
      return;
    }

    setIsExpanded(
      (currentValue) =>
        !currentValue,
    );
  }

  return (
    <View
      style={[
        styles.wrapper,

        depth > 0 && {
          marginLeft:
            Math.min(
              depth,
              3,
            ) * 14,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          canExpand
            ? `${isExpanded ? "Collapse" : "Expand"} ${node.title}`
            : node.title
        }
        onPress={toggleExpanded}
        style={({ pressed }) => [
          styles.nodeCard,
          depth === 0 &&
            styles.rootNodeCard,
          pressed &&
            canExpand &&
            styles.pressed,
        ]}
      >
        <View
          style={[
            styles.kindIndicator,
            depth === 0 &&
              styles.rootIndicator,
          ]}
        />

        <View style={styles.iconContainer}>
          <Ionicons
            color={
              theme.colors.primary
            }
            name={getNodeIcon(
              node.kind,
            )}
            size={20}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={2}
              style={styles.title}
            >
              {node.title}
            </Text>

            <View
              style={
                styles.countBadge
              }
            >
              <Text
                style={
                  styles.countText
                }
              >
                {
                  node.discoveryIds
                    .length
                }
              </Text>
            </View>
          </View>

          {node.description ? (
            <Text
              numberOfLines={
                isExpanded ? 3 : 2
              }
              style={
                styles.description
              }
            >
              {node.description}
            </Text>
          ) : null}

          <View style={styles.metadataRow}>
            <Text style={styles.kindLabel}>
              {formatKind(
                node.kind,
              )}
            </Text>

            <Text style={styles.confidence}>
              {Math.round(
                node.confidence *
                  100,
              )}
              % confidence
            </Text>
          </View>
        </View>

        {canExpand ? (
          <Ionicons
            color={
              theme.colors
                .textSecondary
            }
            name={
              isExpanded
                ? "chevron-up"
                : "chevron-down"
            }
            size={18}
          />
        ) : null}
      </Pressable>

      {isExpanded ? (
        <View style={styles.expandedContent}>
          {node.keywords.length > 0 ? (
            <View style={styles.keywords}>
              {node.keywords
                .slice(0, 5)
                .map((keyword) => (
                  <View
                    key={`${node.id}-${keyword}`}
                    style={
                      styles.keywordChip
                    }
                  >
                    <Text
                      style={
                        styles.keywordText
                      }
                    >
                      {keyword}
                    </Text>
                  </View>
                ))}
            </View>
          ) : null}

          {children.length > 0 ? (
            <View style={styles.children}>
              {children.map(
                (child) => (
                  <KnowledgeTreeNode
                    allNodes={
                      allNodes
                    }
                    depth={
                      depth + 1
                    }
                    discoveries={
                      discoveries
                    }
                    key={child.id}
                    node={child}
                    onOpenDiscovery={
                      onOpenDiscovery
                    }
                  />
                ),
              )}
            </View>
          ) : null}

          {directDiscoveries.length >
          0 ? (
            <View
              style={
                styles.discoverySection
              }
            >
              <Text
                style={
                  styles.discoverySectionTitle
                }
              >
                Discoveries
              </Text>

              <View
                style={
                  styles.discoveryList
                }
              >
                {directDiscoveries.map(
                  (discovery) => (
                    <DiscoveryCard
                      discovery={
                        discovery
                      }
                      key={
                        discovery.id
                      }
                      onPress={
                        onOpenDiscovery
                      }
                    />
                  ),
                )}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function getNodeIcon(
  kind: KnowledgeGraphNode["kind"],
): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case "domain":
      return "library-outline";

    case "topic":
      return "folder-open-outline";

    case "subtopic":
      return "layers-outline";

    case "concept":
      return "bulb-outline";

    default:
      return "ellipse-outline";
  }
}

function formatKind(
  kind: KnowledgeGraphNode["kind"],
): string {
  switch (kind) {
    case "domain":
      return "Domain";

    case "topic":
      return "Planet";

    case "subtopic":
      return "Subtopic";

    case "concept":
      return "Concept";

    default:
      return kind;
  }
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom:
      theme.spacing.md,
  },

  nodeCard: {
    alignItems: "center",

    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    flexDirection: "row",

    overflow: "hidden",

    padding:
      theme.spacing.md,
  },

  rootNodeCard: {
    padding:
      theme.spacing.lg,
  },

  kindIndicator: {
    alignSelf: "stretch",

    backgroundColor:
      theme.colors.border,

    borderRadius: 999,

    marginRight:
      theme.spacing.md,

    width: 3,
  },

  rootIndicator: {
    backgroundColor:
      theme.colors.primary,
  },

  iconContainer: {
    alignItems: "center",

    backgroundColor:
      theme.colors.background,

    borderRadius: 999,

    height: 38,

    justifyContent: "center",

    marginRight:
      theme.spacing.md,

    width: 38,
  },

  content: {
    flex: 1,
  },

  titleRow: {
    alignItems: "center",

    flexDirection: "row",

    gap:
      theme.spacing.sm,
  },

  title: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.text,

    flex: 1,
  },

  countBadge: {
    alignItems: "center",

    backgroundColor:
      theme.colors.background,

    borderRadius: 999,

    justifyContent: "center",

    minWidth: 26,

    paddingHorizontal:
      theme.spacing.sm,

    paddingVertical: 3,
  },

  countText: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,
  },

  description: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    lineHeight: 17,

    marginTop:
      theme.spacing.xs,
  },

  metadataRow: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.sm,

    marginTop:
      theme.spacing.sm,
  },

  kindLabel: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,
  },

  confidence: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },

  expandedContent: {
    borderLeftColor:
      theme.colors.border,

    borderLeftWidth: 1,

    marginLeft:
      theme.spacing.lg,

    paddingLeft:
      theme.spacing.sm,

    paddingTop:
      theme.spacing.md,
  },

  keywords: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.xs,

    marginBottom:
      theme.spacing.md,
  },

  keywordChip: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius: 999,

    borderWidth: 1,

    paddingHorizontal:
      theme.spacing.sm,

    paddingVertical:
      theme.spacing.xs,
  },

  keywordText: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },

  children: {
    gap:
      theme.spacing.xs,
  },

  discoverySection: {
    marginTop:
      theme.spacing.md,
  },

  discoverySectionTitle: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    letterSpacing: 1,

    marginBottom:
      theme.spacing.md,

    textTransform: "uppercase",
  },

  discoveryList: {
    gap:
      theme.spacing.md,
  },

  pressed: {
    opacity: 0.7,
  },
});
