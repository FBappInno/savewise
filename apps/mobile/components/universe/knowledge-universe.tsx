import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import {
  useSharedValue,
} from "react-native-reanimated";

import type {
  Discovery,
  KnowledgeGraph,
} from "@savewise/shared";

import {
  centerUniverse,
  focusUniversePoint,
  type UniverseCameraState,
} from "@/components/universe/universe-camera";

import {
  UniverseBackground,
} from "@/components/universe/universe-background";

import {
  UniverseConnection,
} from "@/components/universe/universe-connection";

import {
  UniverseCoreNode,
} from "@/components/universe/universe-core-node";

import {
  UniverseGestures,
} from "@/components/universe/universe-gestures";

import {
  buildUniverseLayout,
} from "@/components/universe/universe-layout";

import {
  UniverseNode,
} from "@/components/universe/universe-node";

import type {
  UniverseNodePlacement,
} from "@/components/universe/universe-types";

import {
  universeTheme,
} from "@/theme/universe-theme";

type Props = {
  graph:
    KnowledgeGraph;

  discoveries:
    Discovery[];

  onOpenDiscovery:
    (
      discovery: Discovery,
    ) => void;
};

const WORLD = {
  width: 1180,
  height: 900,
};

const INITIAL_SCALE = 0.72;

export function KnowledgeUniverse({
  graph,
  discoveries,
  onOpenDiscovery,
}: Props) {
  const screenWidth =
    Dimensions.get(
      "window",
    ).width;

  const viewport = {
    width:
      screenWidth,

    height:
      screenWidth < 430
        ? 650
        : 720,
  };

  const [
    expandedDomainId,
    setExpandedDomainId,
  ] =
    useState<
      string | null
    >(null);

  const [
    expandedTopicId,
    setExpandedTopicId,
  ] =
    useState<
      string | null
    >(null);

  const [
    selectedNodeId,
    setSelectedNodeId,
  ] =
    useState<
      string | null
    >(null);

  const scale =
    useSharedValue(
      INITIAL_SCALE,
    );

  const translateX =
    useSharedValue(0);

  const translateY =
    useSharedValue(0);

  const camera =
    useMemo<
      UniverseCameraState
    >(
      () => ({
        scale,
        translateX,
        translateY,
      }),
      [
        scale,
        translateX,
        translateY,
      ],
    );

  const layout =
    useMemo(
      () =>
        buildUniverseLayout(
          graph,
          {
            worldWidth:
              WORLD.width,

            worldHeight:
              WORLD.height,

            expandedDomainId,

            expandedTopicId,
          },
        ),
      [
        expandedDomainId,
        expandedTopicId,
        graph,
      ],
    );

  const selectedNode =
    selectedNodeId
      ? graph.nodes.find(
          (node) =>
            node.id ===
            selectedNodeId,
        ) ?? null
      : null;

  const selectedDiscoveries =
    useMemo(() => {
      if (!selectedNode) {
        return [];
      }

      const ids =
        new Set(
          selectedNode
            .discoveryIds,
        );

      return discoveries
        .filter(
          (discovery) =>
            ids.has(
              discovery.id,
            ),
        )
        .slice(0, 5);
    }, [
      discoveries,
      selectedNode,
    ]);

  useEffect(() => {
    centerUniverse(
      camera,
      viewport,
      WORLD,
      {
        animated: false,
      },
    );
  }, []);

  function resetUniverse() {
    setExpandedDomainId(
      null,
    );

    setExpandedTopicId(
      null,
    );

    setSelectedNodeId(
      null,
    );

    scale.value =
      INITIAL_SCALE;

    centerUniverse(
      camera,
      viewport,
      WORLD,
    );
  }

  function selectNode(
    placement:
      UniverseNodePlacement,
  ) {
    const node =
      placement.node;

    if (
      placement.level ===
      "domain"
    ) {
      if (
        expandedDomainId ===
        node.id
      ) {
        setExpandedDomainId(
          null,
        );

        setExpandedTopicId(
          null,
        );
      } else {
        setExpandedDomainId(
          node.id,
        );

        setExpandedTopicId(
          null,
        );
      }
    }

    if (
      placement.level ===
      "topic"
    ) {
      setExpandedTopicId(
        expandedTopicId ===
          node.id
          ? null
          : node.id,
      );
    }

    setSelectedNodeId(
      node.id,
    );

    /*
     * Nur die Kamera fährt zum Knoten.
     * Der Knoten selbst bleibt an seiner ursprünglichen Position.
     */
    focusUniversePoint(
      camera,
      placement.position,
      viewport,
      WORLD,
    );
  }

  return (
    <GestureHandlerRootView
      style={
        styles.wrapper
      }
    >
      <View
        style={[
          styles.viewport,

          {
            height:
              viewport.height,
          },
        ]}
      >
        <UniverseBackground />

        <UniverseGestures
          camera={camera}
          viewport={viewport}
          world={WORLD}
        >
          {layout.connections.map(
            (connection) => (
              <UniverseConnection
                connection={
                  connection
                }
                key={
                  connection.id
                }
              />
            ),
          )}

          <UniverseCoreNode
            onPress={
              resetUniverse
            }
            position={
              layout.center
            }
          />

          {layout.nodes.map(
            (placement) => (
              <UniverseNode
                expanded={
                  placement.node.id ===
                    expandedDomainId ||
                  placement.node.id ===
                    expandedTopicId
                }
                key={
                  placement.node.id
                }
                onPress={() => {
                  selectNode(
                    placement,
                  );
                }}
                placement={
                  placement
                }
                selected={
                  placement.node.id ===
                  selectedNodeId
                }
              />
            ),
          )}
        </UniverseGestures>

        <View
          pointerEvents="none"
          style={
            styles.levelBadge
          }
        >
          <Text
            style={
              styles.levelBadgeText
            }
          >
            DOMÄNE · TOPIC ·
            UNTERTHEMA
          </Text>
        </View>

        <View
          pointerEvents="none"
          style={
            styles.gestureHint
          }
        >
          <Text
            style={
              styles.gestureHintText
            }
          >
            1 Finger verschieben ·
            2 Finger zoomen
          </Text>
        </View>
      </View>

      {selectedNode ? (
        <View
          style={
            styles.selectionCard
          }
        >
          <Text
            style={
              styles.selectionLevel
            }
          >
            {getNodeLevel(
              selectedNode.kind,
            )}
          </Text>

          <Text
            style={
              styles.selectionTitle
            }
          >
            {selectedNode.title}
          </Text>

          <Text
            style={
              styles.selectionMeta
            }
          >
            {
              selectedNode
                .discoveryIds
                .length
            }{" "}
            Discoveries
          </Text>

          {selectedDiscoveries.map(
            (discovery) => (
              <Text
                key={
                  discovery.id
                }
                numberOfLines={1}
                onPress={() => {
                  onOpenDiscovery(
                    discovery,
                  );
                }}
                style={
                  styles.discoveryLink
                }
              >
                {discovery.improvedTitle ||
                  discovery.title}
              </Text>
            ),
          )}
        </View>
      ) : (
        <View
          style={
            styles.hintCard
          }
        >
          <Text
            style={
              styles.hintTitle
            }
          >
            Wissen erkunden
          </Text>

          <Text
            style={
              styles.hintText
            }
          >
            Tippe auf eine Domäne.
            Ihre Topics öffnen sich
            an derselben Position.
          </Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

function getNodeLevel(
  kind: string,
): string {
  if (
    kind === "domain"
  ) {
    return "DOMÄNE";
  }

  if (
    kind === "topic"
  ) {
    return "TOPIC";
  }

  if (
    kind === "subtopic"
  ) {
    return "UNTERTHEMA";
  }

  return "WISSENSKNOTEN";
}

const styles =
  StyleSheet.create({
    wrapper: {
      backgroundColor:
        universeTheme.colors
          .background,
      flex: 1,
    },

    viewport: {
      backgroundColor:
        universeTheme.colors
          .background,
      overflow: "hidden",
      position: "relative",
      width: "100%",
    },

    levelBadge: {
      backgroundColor:
        "rgba(8, 23, 40, 0.92)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      left: 14,
      paddingHorizontal: 11,
      paddingVertical: 7,
      position: "absolute",
      top: 14,
    },

    levelBadgeText: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.7,
    },

    gestureHint: {
      backgroundColor:
        "rgba(8, 23, 40, 0.90)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      bottom: 14,
      left: 14,
      paddingHorizontal: 10,
      paddingVertical: 7,
      position: "absolute",
    },

    gestureHintText: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 9,
      fontWeight: "700",
    },

    selectionCard: {
      backgroundColor:
        universeTheme.colors
          .surfaceStrong,
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius:
        universeTheme.radius
          .lg,
      borderWidth: 1,
      marginBottom: 22,
      marginHorizontal: 16,
      marginTop: 14,
      padding: 18,
    },

    selectionLevel: {
      color:
        universeTheme.colors
          .primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    selectionTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 21,
      fontWeight: "900",
      marginTop: 4,
    },

    selectionMeta: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 11,
      marginTop: 6,
    },

    discoveryLink: {
      borderTopColor:
        universeTheme.colors
          .border,
      borderTopWidth: 1,
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 12,
      paddingTop: 12,
    },

    hintCard: {
      backgroundColor:
        universeTheme.colors
          .surface,
      borderColor:
        universeTheme.colors
          .border,
      borderRadius:
        universeTheme.radius
          .lg,
      borderWidth: 1,
      marginBottom: 22,
      marginHorizontal: 16,
      marginTop: 14,
      padding: 16,
    },

    hintTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 14,
      fontWeight: "800",
    },

    hintText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
    },
  });