import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useRef,
} from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { KnowledgeTree } from "@/components/library/knowledge-tree";
import { LibraryOverview } from "@/components/library/library-overview";
import { useKnowledgeLibrary } from "@/hooks/use-knowledge-library";
import { theme } from "@/theme";
import type { Discovery } from "@/types/discovery";

export default function LibraryScreen() {
  const scrollViewRef =
    useRef<ScrollView>(null);

  const treePosition =
    useRef(0);

  const connectionsPosition =
    useRef(0);

  const {
    library,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useKnowledgeLibrary();

  function openDiscoveries() {
    router.push("/");
  }

  function openDiscovery(
    discovery: Discovery,
  ) {
    router.push(
      `/discovery/${discovery.id}`,
    );
  }

  function scrollToTree() {
    scrollViewRef.current?.scrollTo({
      animated: true,
      y: Math.max(
        0,
        treePosition.current - 24,
      ),
    });
  }

  function scrollToConnections() {
    scrollViewRef.current?.scrollTo({
      animated: true,
      y: Math.max(
        0,
        connectionsPosition.current -
          24,
      ),
    });
  }

  function saveTreePosition(
    event: LayoutChangeEvent,
  ) {
    treePosition.current =
      event.nativeEvent.layout.y;
  }

  function saveConnectionsPosition(
    event: LayoutChangeEvent,
  ) {
    connectionsPosition.current =
      event.nativeEvent.layout.y;
  }

  const graph =
    library?.graph ?? null;

  return (
    <ScrollView
      contentContainerStyle={
        styles.content
      }
      ref={scrollViewRef}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            void refresh();
          }}
        />
      }
      showsVerticalScrollIndicator={
        false
      }
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          PERSONAL KNOWLEDGE
        </Text>

        <Text style={styles.title}>
          Library
        </Text>

        <Text style={styles.subtitle}>
          Your knowledge is organized
          automatically by SaveWise AI.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />

          <Text style={styles.loadingText}>
            Building your personal
            knowledge graph...
          </Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>
            Library unavailable
          </Text>

          <Text style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : null}

      {!isLoading &&
      library &&
      !error ? (
        <>
          <LibraryOverview
            connections={
              graph?.relations.length ??
              library.relations.length
            }
            discoveries={
              library.discoveries.length
            }
            domains={
              graph?.rootNodeIds.length ??
              0
            }
            knowledgeNodes={
              graph?.nodes.length ?? 0
            }
            onOpenConnections={
              scrollToConnections
            }
            onOpenDiscoveries={
              openDiscoveries
            }
            onOpenTree={scrollToTree}
          />

          {graph ? (
            <View
              style={
                styles.graphSummary
              }
            >
              <View
                style={
                  styles.graphSummaryHeader
                }
              >
                <View
                  style={
                    styles.aiIcon
                  }
                >
                  <Ionicons
                    color={
                      theme.colors.primary
                    }
                    name="sparkles-outline"
                    size={19}
                  />
                </View>

                <View
                  style={
                    styles.graphSummaryTitleContainer
                  }
                >
                  <Text
                    style={
                      styles.graphSummaryLabel
                    }
                  >
                    AI KNOWLEDGE MAP
                  </Text>

                  <Text
                    style={
                      styles.graphLanguage
                    }
                  >
                    {graph.language.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.graphSummaryText
                }
              >
                {graph.summary}
              </Text>
            </View>
          ) : (
            <View style={styles.messageCard}>
              <Text
                style={
                  styles.messageTitle
                }
              >
                AI graph unavailable
              </Text>

              <Text
                style={
                  styles.messageText
                }
              >
                Pull down to retry
                building your personal
                knowledge graph.
              </Text>
            </View>
          )}

          <View
            onLayout={
              saveTreePosition
            }
            style={styles.section}
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  KNOWLEDGE TREE
                </Text>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Your knowledge
                </Text>
              </View>

              {graph ? (
                <Text
                  style={
                    styles.sectionCount
                  }
                >
                  {graph.nodes.length}{" "}
                  nodes
                </Text>
              ) : null}
            </View>

            {graph ? (
              <KnowledgeTree
                discoveries={
                  library.discoveries
                }
                graph={graph}
                onOpenDiscovery={
                  openDiscovery
                }
              />
            ) : (
              <View
                style={
                  styles.messageCard
                }
              >
                <Text
                  style={
                    styles.messageTitle
                  }
                >
                  No knowledge tree
                </Text>

                <Text
                  style={
                    styles.messageText
                  }
                >
                  Add discoveries and
                  rebuild the AI graph.
                </Text>
              </View>
            )}
          </View>

          <View
            onLayout={
              saveConnectionsPosition
            }
            style={styles.section}
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  SEMANTIC NETWORK
                </Text>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Connections
                </Text>
              </View>

              <Text
                style={
                  styles.sectionCount
                }
              >
                {
                  graph?.relations
                    .length ?? 0
                }
              </Text>
            </View>

            {graph &&
            graph.relations.length >
              0 ? (
              <View
                style={
                  styles.connectionList
                }
              >
                {graph.relations
                  .filter(
                    (relation) =>
                      relation.kind !==
                      "part-of",
                  )
                  .slice(0, 10)
                  .map((relation) => {
                    const sourceNode =
                      graph.nodes.find(
                        (node) =>
                          node.id ===
                          relation.sourceId,
                      );

                    const targetNode =
                      graph.nodes.find(
                        (node) =>
                          node.id ===
                          relation.targetId,
                      );

                    if (
                      !sourceNode ||
                      !targetNode
                    ) {
                      return null;
                    }

                    return (
                      <View
                        key={relation.id}
                        style={
                          styles.connectionCard
                        }
                      >
                        <View
                          style={
                            styles.connectionHeader
                          }
                        >
                          <Text
                            numberOfLines={2}
                            style={
                              styles.connectionNode
                            }
                          >
                            {
                              sourceNode.title
                            }
                          </Text>

                          <Ionicons
                            color={
                              theme.colors
                                .primary
                            }
                            name="git-compare-outline"
                            size={18}
                          />

                          <Text
                            numberOfLines={2}
                            style={
                              styles.connectionNode
                            }
                          >
                            {
                              targetNode.title
                            }
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.connectionKind
                          }
                        >
                          {formatRelationKind(
                            relation.kind,
                          )}
                          {" · "}
                          {Math.round(
                            relation.strength *
                              100,
                          )}
                          %
                        </Text>

                        <Text
                          style={
                            styles.connectionReason
                          }
                        >
                          {relation.reason}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            ) : (
              <View
                style={
                  styles.messageCard
                }
              >
                <Text
                  style={
                    styles.messageTitle
                  }
                >
                  No cross-topic
                  connections yet
                </Text>

                <Text
                  style={
                    styles.messageText
                  }
                >
                  Hierarchical
                  relationships already
                  exist in the knowledge
                  tree. Additional
                  semantic connections
                  will appear as the
                  library grows.
                </Text>
              </View>
            )}
          </View>

          {graph ? (
            <View
              style={
                styles.generatedCard
              }
            >
              <Ionicons
                color={
                  theme.colors
                    .textSecondary
                }
                name="time-outline"
                size={16}
              />

              <Text
                style={
                  styles.generatedText
                }
              >
                Knowledge graph updated{" "}
                {formatDate(
                  graph.generatedAt,
                )}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function formatRelationKind(
  value: string,
): string {
  return value
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function formatDate(
  value: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
    },
  ).format(date);
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor:
      theme.colors.background,
  },

  content: {
    paddingBottom:
      theme.spacing.xxxl,

    paddingHorizontal:
      theme.spacing.xl,

    paddingTop:
      theme.spacing.xxxl,
  },

  header: {
    marginBottom:
      theme.spacing.xxl,
  },

  eyebrow: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    letterSpacing: 1.2,
  },

  title: {
    ...theme.typography.screenTitle,

    color:
      theme.colors.text,

    marginTop:
      theme.spacing.sm,
  },

  subtitle: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    lineHeight: 22,

    marginTop:
      theme.spacing.sm,
  },

  centered: {
    alignItems: "center",

    paddingVertical:
      theme.spacing.xxxl,
  },

  loadingText: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.md,

    textAlign: "center",
  },

  graphSummary: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    marginTop:
      theme.spacing.xxl,

    padding:
      theme.spacing.lg,
  },

  graphSummaryHeader: {
    alignItems: "center",

    flexDirection: "row",
  },

  aiIcon: {
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

  graphSummaryTitleContainer: {
    alignItems: "center",

    flex: 1,

    flexDirection: "row",

    justifyContent:
      "space-between",
  },

  graphSummaryLabel: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    letterSpacing: 1,
  },

  graphLanguage: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },

  graphSummaryText: {
    ...theme.typography.body,

    color:
      theme.colors.text,

    lineHeight: 22,

    marginTop:
      theme.spacing.md,
  },

  section: {
    marginTop:
      theme.spacing.xxxl,
  },

  sectionHeader: {
    alignItems: "flex-end",

    flexDirection: "row",

    justifyContent:
      "space-between",

    marginBottom:
      theme.spacing.lg,
  },

  sectionEyebrow: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    letterSpacing: 1,
  },

  sectionTitle: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,

    marginTop:
      theme.spacing.xs,
  },

  sectionCount: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },

  connectionList: {
    gap:
      theme.spacing.md,
  },

  connectionCard: {
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

  connectionHeader: {
    alignItems: "center",

    flexDirection: "row",

    gap:
      theme.spacing.sm,
  },

  connectionNode: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.text,

    flex: 1,
  },

  connectionKind: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    marginTop:
      theme.spacing.md,
  },

  connectionReason: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    lineHeight: 20,

    marginTop:
      theme.spacing.sm,
  },

  messageCard: {
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

  messageTitle: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,
  },

  messageText: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    lineHeight: 21,

    marginTop:
      theme.spacing.sm,
  },

  generatedCard: {
    alignItems: "center",

    flexDirection: "row",

    gap:
      theme.spacing.sm,

    justifyContent: "center",

    marginTop:
      theme.spacing.xxxl,

    padding:
      theme.spacing.md,
  },

  generatedText: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },
});
