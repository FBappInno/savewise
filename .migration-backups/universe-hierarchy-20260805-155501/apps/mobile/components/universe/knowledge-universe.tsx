import { Ionicons } from "@expo/vector-icons";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  Discovery,
  KnowledgeGraph,
  KnowledgeGraphNode,
} from "@savewise/shared";

import {
  useUniverseLayout,
  type UniverseLayoutConnection,
  type UniverseLayoutLevel,
  type UniverseLayoutNode,
} from "@/hooks/use-universe-layout";

import {
  universeTheme,
  type UniverseColor,
} from "@/theme/universe-theme";

type Props = {
  graph: KnowledgeGraph;
  discoveries: Discovery[];

  onOpenDiscovery: (
    discovery: Discovery,
  ) => void;
};

const ROOT_COLORS:
  UniverseColor[] = [
  "cyan",
  "violet",
  "blue",
  "green",
  "purple",
  "orange",
  "yellow",
  "pink",
];

const ROOT_ICONS: Array<
  keyof typeof Ionicons.glyphMap
> = [
  "sparkles-outline",
  "hardware-chip-outline",
  "radio-outline",
  "shield-checkmark-outline",
  "rocket-outline",
  "business-outline",
  "code-slash-outline",
  "trending-up-outline",
];

export function KnowledgeUniverse({
  graph,
  discoveries,
  onOpenDiscovery,
}: Props) {
  const screenWidth =
    Dimensions.get(
      "window",
    ).width;

  const canvasWidth =
    Math.max(
      360,
      screenWidth,
    );

  const canvasHeight =
    screenWidth < 430
      ? 690
      : 760;

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

  const layout =
    useUniverseLayout(
      graph,
      {
        width:
          canvasWidth,

        height:
          canvasHeight,

        expandedDomainId,

        expandedTopicId,
      },
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

      const discoveryIds =
        new Set(
          selectedNode.discoveryIds,
        );

      return discoveries
        .filter(
          (discovery) =>
            discoveryIds.has(
              discovery.id,
            ),
        )
        .slice(0, 6);
    }, [
      discoveries,
      selectedNode,
    ]);

  function handleNodePress(
    layoutNode:
      UniverseLayoutNode,
  ) {
    const node =
      layoutNode.node;

    if (
      layoutNode.level ===
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

        setSelectedNodeId(
          null,
        );

        return;
      }

      setExpandedDomainId(
        node.id,
      );

      setExpandedTopicId(
        null,
      );

      setSelectedNodeId(
        node.id,
      );

      return;
    }

    if (
      layoutNode.level ===
      "topic"
    ) {
      if (
        expandedTopicId ===
        node.id
      ) {
        setExpandedTopicId(
          null,
        );

        setSelectedNodeId(
          node.id,
        );

        return;
      }

      setExpandedTopicId(
        node.id,
      );

      setSelectedNodeId(
        node.id,
      );

      return;
    }

    setSelectedNodeId(
      node.id,
    );
  }

  function closeSelection() {
    setSelectedNodeId(
      null,
    );
  }

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
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.canvas,

          {
            height:
              canvasHeight,

            width:
              canvasWidth,
          },
        ]}
      >
        <StarField />

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

        <CenterNode
          onPress={
            resetUniverse
          }
          x={layout.center.x}
          y={layout.center.y}
        />

        {layout.nodes.map(
          (layoutNode) => (
            <UniverseNode
              isExpanded={
                expandedDomainId ===
                  layoutNode.node.id ||
                expandedTopicId ===
                  layoutNode.node.id
              }
              isSelected={
                selectedNodeId ===
                layoutNode.node.id
              }
              key={
                layoutNode.node.id
              }
              layoutNode={
                layoutNode
              }
              onPress={() => {
                handleNodePress(
                  layoutNode,
                );
              }}
            />
          ),
        )}

        <View
          style={
            styles.modePill
          }
        >
          <Ionicons
            color={
              universeTheme.colors
                .primaryBright
            }
            name="git-network-outline"
            size={16}
          />

          <Text
            style={
              styles.modePillText
            }
          >
            DOMÄNE · TOPIC ·
            UNTERTHEMA
          </Text>
        </View>

        {expandedDomainId ? (
          <Pressable
            accessibilityRole="button"
            onPress={
              resetUniverse
            }
            style={({
              pressed,
            }) => [
              styles.resetButton,

              pressed &&
                styles.nodePressed,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .textSecondary
              }
              name="contract-outline"
              size={16}
            />

            <Text
              style={
                styles.resetButtonText
              }
            >
              Alles einklappen
            </Text>
          </Pressable>
        ) : null}
      </View>

      <HierarchyLegend />

      {selectedNode ? (
        <UniverseDetailCard
          discoveries={
            selectedDiscoveries
          }
          graph={graph}
          node={selectedNode}
          onClose={
            closeSelection
          }
          onOpenDiscovery={
            onOpenDiscovery
          }
        />
      ) : (
        <View
          style={
            styles.hintCard
          }
        >
          <Ionicons
            color={
              universeTheme.colors
                .primary
            }
            name="finger-print-outline"
            size={20}
          />

          <View
            style={
              styles.flex
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
              Tippe zuerst auf eine
              Domäne. Danach werden
              ihre Topics als neue
              Sterne eingeblendet.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function CenterNode({
  x,
  y,
  onPress,
}: {
  x: number;
  y: number;
  onPress: () => void;
}) {
  const pulse =
    useRef(
      new Animated.Value(0),
    ).current;

  useEffect(() => {
    const animation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            pulse,
            {
              duration: 1800,
              toValue: 1,
              useNativeDriver:
                true,
            },
          ),

          Animated.timing(
            pulse,
            {
              duration: 1800,
              toValue: 0,
              useNativeDriver:
                true,
            },
          ),
        ]),
      );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  const scale =
    pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [
        1,
        1.08,
      ],
    });

  const opacity =
    pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [
        0.45,
        0.08,
      ],
    });

  const size =
    universeTheme.node
      .centerSize;

  return (
    <Pressable
      accessibilityLabel="Universum zurücksetzen"
      accessibilityRole="button"
      onPress={onPress}
      style={({
        pressed,
      }) => [
        styles.absoluteNode,

        {
          height: size,
          left:
            x -
            size / 2,
          top:
            y -
            size / 2,
          width: size,
        },

        pressed &&
          styles.nodePressed,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.centerPulse,

          {
            opacity,

            transform: [
              {
                scale,
              },
            ],
          },
        ]}
      />

      <View
        style={
          styles.centerNode
        }
      >
        <View
          style={
            styles.centerLogo
          }
        >
          <Text
            style={
              styles.centerLogoText
            }
          >
            S
          </Text>
        </View>

        <Text
          style={
            styles.centerTitle
          }
        >
          SAVEWISE
        </Text>
      </View>
    </Pressable>
  );
}

function UniverseNode({
  layoutNode,
  isExpanded,
  isSelected,
  onPress,
}: {
  layoutNode:
    UniverseLayoutNode;

  isExpanded: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  const color =
    getRootColor(
      layoutNode.rootIndex,
    );

  const discoveryCount =
    layoutNode.node
      .discoveryIds.length;

  const size =
    getNodeSize(
      layoutNode.level,
      discoveryCount,
      isExpanded ||
        isSelected,
    );

  const icon =
    getNodeIcon(
      layoutNode,
    );

  const label =
    getNodeLevelLabel(
      layoutNode.level,
    );

  return (
    <Pressable
      accessibilityLabel={
        `${label}: ${layoutNode.node.title}`
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({
        pressed,
      }) => [
        styles.absoluteNode,

        {
          height:
            size + 70,

          left:
            layoutNode.position.x -
            (size + 70) / 2,

          top:
            layoutNode.position.y -
            (size + 70) / 2,

          width:
            size + 70,
        },

        pressed &&
          styles.nodePressed,
      ]}
    >
      <View
        style={[
          styles.nodeBody,

          getLevelNodeStyle(
            layoutNode.level,
          ),

          {
            backgroundColor:
              `${color}${
                layoutNode.level ===
                "domain"
                  ? "18"
                  : layoutNode.level ===
                      "topic"
                    ? "20"
                    : "26"
              }`,

            borderColor:
              color,

            borderRadius:
              size / 2,

            height: size,

            shadowColor:
              color,

            width: size,
          },

          (isExpanded ||
            isSelected) &&
            styles.nodeSelected,
        ]}
      >
        <Ionicons
          color={color}
          name={icon}
          size={
            layoutNode.level ===
            "domain"
              ? isExpanded
                ? 34
                : 27
              : layoutNode.level ===
                  "topic"
                ? isExpanded
                  ? 27
                  : 22
                : 15
          }
        />
      </View>

      <Text
        numberOfLines={2}
        style={[
          styles.nodeLabel,

          layoutNode.level ===
            "domain" &&
            styles.domainLabel,

          layoutNode.level ===
            "topic" &&
            styles.topicLabel,

          layoutNode.level ===
            "subtopic" &&
            styles.subtopicLabel,

          (isExpanded ||
            isSelected) &&
            styles.nodeLabelSelected,
        ]}
      >
        {layoutNode.node.title}
      </Text>

      {(isExpanded ||
        isSelected) ? (
        <View
          style={[
            styles.nodeBadge,

            {
              borderColor:
                `${color}88`,
            },
          ]}
        >
          <Text
            style={[
              styles.nodeBadgeText,

              {
                color,
              },
            ]}
          >
            {label}
            {" · "}
            {discoveryCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function UniverseConnection({
  connection,
}: {
  connection:
    UniverseLayoutConnection;
}) {
  const deltaX =
    connection.to.x -
    connection.from.x;

  const deltaY =
    connection.to.y -
    connection.from.y;

  const length =
    Math.sqrt(
      deltaX * deltaX +
        deltaY * deltaY,
    );

  const angle =
    Math.atan2(
      deltaY,
      deltaX,
    ) *
    (180 / Math.PI);

  const color =
    getRootColor(
      connection.rootIndex,
    );

  const opacity =
    connection.level ===
    "domain"
      ? "A0"
      : connection.level ===
          "topic"
        ? "82"
        : "62";

  return (
    <View
      pointerEvents="none"
      style={[
        styles.connection,

        {
          backgroundColor:
            `${color}${opacity}`,

          height:
            connection.level ===
            "domain"
              ? 1.5
              : 1,

          left:
            connection.from.x,

          top:
            connection.from.y,

          transform: [
            {
              rotateZ:
                `${angle}deg`,
            },
          ],

          width:
            length,
        },
      ]}
    />
  );
}

function HierarchyLegend() {
  return (
    <View
      style={
        styles.legend
      }
    >
      <LegendItem
        icon="planet-outline"
        label="Domäne"
      />

      <View
        style={
          styles.legendDivider
        }
      />

      <LegendItem
        icon="sunny-outline"
        label="Topic"
      />

      <View
        style={
          styles.legendDivider
        }
      />

      <LegendItem
        icon="star-outline"
        label="Unterthema"
      />
    </View>
  );
}

function LegendItem({
  icon,
  label,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  label: string;
}) {
  return (
    <View
      style={
        styles.legendItem
      }
    >
      <Ionicons
        color={
          universeTheme.colors
            .primaryBright
        }
        name={icon}
        size={14}
      />

      <Text
        style={
          styles.legendText
        }
      >
        {label}
      </Text>
    </View>
  );
}

function StarField() {
  const stars =
    useMemo(
      () =>
        Array.from(
          {
            length: 72,
          },
          (
            _,
            index,
          ) => ({
            id: index,

            left:
              ((index * 47) %
                100) +
              (index % 3) *
                0.23,

            top:
              ((index * 73) %
                100) +
              (index % 4) *
                0.17,

            size:
              index % 9 === 0
                ? 2.4
                : index % 4 ===
                    0
                  ? 1.6
                  : 1,

            opacity:
              index % 7 === 0
                ? 0.9
                : index % 3 ===
                    0
                  ? 0.55
                  : 0.3,
          }),
        ),
      [],
    );

  return (
    <View
      pointerEvents="none"
      style={
        StyleSheet.absoluteFill
      }
    >
      <View
        style={
          styles.backgroundNebula
        }
      />

      {stars.map(
        (star) => (
          <View
            key={star.id}
            style={[
              styles.star,

              {
                height:
                  star.size,

                left:
                  `${star.left}%`,

                opacity:
                  star.opacity,

                top:
                  `${star.top}%`,

                width:
                  star.size,
              },
            ]}
          />
        ),
      )}
    </View>
  );
}

function UniverseDetailCard({
  node,
  graph,
  discoveries,
  onClose,
  onOpenDiscovery,
}: {
  node:
    KnowledgeGraphNode;

  graph:
    KnowledgeGraph;

  discoveries:
    Discovery[];

  onClose:
    () => void;

  onOpenDiscovery:
    (
      discovery: Discovery,
    ) => void;
}) {
  const children =
    graph.nodes.filter(
      (candidate) =>
        candidate.parentId ===
        node.id,
    );

  const levelLabel =
    getGraphNodeLabel(
      node,
    );

  const childLabel =
    node.kind === "domain"
      ? "Topics"
      : node.kind === "topic"
        ? "Unterthemen"
        : "Untergeordnete Knoten";

  return (
    <View
      style={
        styles.detailCard
      }
    >
      <View
        style={
          styles.detailHeader
        }
      >
        <View
          style={
            styles.flex
          }
        >
          <Text
            style={
              styles.detailEyebrow
            }
          >
            {levelLabel.toUpperCase()}
          </Text>

          <Text
            style={
              styles.detailTitle
            }
          >
            {node.title}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Detailansicht schließen"
          accessibilityRole="button"
          onPress={onClose}
          style={({
            pressed,
          }) => [
            styles.closeButton,

            pressed &&
              styles.nodePressed,
          ]}
        >
          <Ionicons
            color={
              universeTheme.colors
                .textSecondary
            }
            name="close"
            size={20}
          />
        </Pressable>
      </View>

      <View
        style={
          styles.metricRow
        }
      >
        <DetailMetric
          icon="documents-outline"
          label="Discoveries"
          value={
            node.discoveryIds
              .length
          }
        />

        <DetailMetric
          icon="git-network-outline"
          label={
            childLabel
          }
          value={
            children.length
          }
        />

        <DetailMetric
          icon="sparkles-outline"
          label="Aktivität"
          value={
            node.discoveryIds
              .length >= 5
              ? "Hoch"
              : "Aktiv"
          }
        />
      </View>

      {children.length >
      0 ? (
        <View
          style={
            styles.topicList
          }
        >
          {children
            .slice(0, 8)
            .map(
              (child) => (
                <View
                  key={
                    child.id
                  }
                  style={
                    styles.topicPill
                  }
                >
                  <View
                    style={
                      styles.topicDot
                    }
                  />

                  <Text
                    numberOfLines={
                      1
                    }
                    style={
                      styles.topicPillText
                    }
                  >
                    {child.title}
                  </Text>
                </View>
              ),
            )}
        </View>
      ) : null}

      {discoveries.length >
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
            ZUGEHÖRIGE
            DISCOVERIES
          </Text>

          {discoveries.map(
            (discovery) => (
              <Pressable
                key={
                  discovery.id
                }
                onPress={() => {
                  onOpenDiscovery(
                    discovery,
                  );
                }}
                style={({
                  pressed,
                }) => [
                  styles.discoveryRow,

                  pressed &&
                    styles.nodePressed,
                ]}
              >
                <View
                  style={
                    styles.discoveryIcon
                  }
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors
                        .primaryBright
                    }
                    name="document-text-outline"
                    size={18}
                  />
                </View>

                <View
                  style={
                    styles.flex
                  }
                >
                  <Text
                    numberOfLines={
                      2
                    }
                    style={
                      styles.discoveryTitle
                    }
                  >
                    {discovery.improvedTitle ||
                      discovery.title}
                  </Text>

                  <Text
                    numberOfLines={
                      1
                    }
                    style={
                      styles.discoveryMeta
                    }
                  >
                    {getDiscoverySource(
                      discovery,
                    )}
                  </Text>
                </View>

                <Ionicons
                  color={
                    universeTheme.colors
                      .textMuted
                  }
                  name="chevron-forward"
                  size={18}
                />
              </Pressable>
            ),
          )}
        </View>
      ) : (
        <Text
          style={
            styles.emptyDetailText
          }
        >
          Zu diesem Knoten sind
          noch keine direkten
          Discoveries hinterlegt.
        </Text>
      )}
    </View>
  );
}

function DetailMetric({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  label: string;
  value:
    | number
    | string;
}) {
  return (
    <View
      style={
        styles.detailMetric
      }
    >
      <Ionicons
        color={
          universeTheme.colors
            .primary
        }
        name={icon}
        size={17}
      />

      <Text
        style={
          styles.detailMetricValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.detailMetricLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

function getNodeSize(
  level:
    UniverseLayoutLevel,
  discoveryCount: number,
  selected: boolean,
): number {
  const growth =
    Math.min(
      18,
      Math.floor(
        Math.sqrt(
          Math.max(
            discoveryCount,
            0,
          ),
        ) * 3,
      ),
    );

  if (
    level === "domain"
  ) {
    return (
      (selected
        ? 88
        : 68) +
      growth
    );
  }

  if (
    level === "topic"
  ) {
    return (
      (selected
        ? 62
        : 48) +
      Math.min(
        growth,
        12,
      )
    );
  }

  return (
    (selected
      ? 38
      : 28) +
    Math.min(
      growth,
      8,
    )
  );
}

function getLevelNodeStyle(
  level:
    UniverseLayoutLevel,
) {
  if (
    level === "domain"
  ) {
    return styles.domainNode;
  }

  if (
    level === "topic"
  ) {
    return styles.topicNode;
  }

  return styles.subtopicNode;
}

function getNodeIcon(
  layoutNode:
    UniverseLayoutNode,
): keyof typeof Ionicons.glyphMap {
  if (
    layoutNode.level ===
    "domain"
  ) {
    return ROOT_ICONS[
      layoutNode.rootIndex %
        ROOT_ICONS.length
    ];
  }

  if (
    layoutNode.level ===
    "topic"
  ) {
    return "sunny-outline";
  }

  return "star-outline";
}

function getNodeLevelLabel(
  level:
    UniverseLayoutLevel,
): string {
  if (
    level === "domain"
  ) {
    return "Domäne";
  }

  if (
    level === "topic"
  ) {
    return "Topic";
  }

  return "Unterthema";
}

function getGraphNodeLabel(
  node:
    KnowledgeGraphNode,
): string {
  if (
    node.kind === "domain"
  ) {
    return "Domäne";
  }

  if (
    node.kind === "topic"
  ) {
    return "Topic";
  }

  if (
    node.kind === "subtopic"
  ) {
    return "Unterthema";
  }

  return "Wissensknoten";
}

function getRootColor(
  index: number,
): string {
  const colorName =
    ROOT_COLORS[
      index %
        ROOT_COLORS.length
    ];

  return universeTheme.colors[
    colorName
  ];
}

function getDiscoverySource(
  discovery: Discovery,
): string {
  try {
    if (
      typeof discovery.url ===
        "string" &&
      discovery.url
    ) {
      return new URL(
        discovery.url,
      ).hostname.replace(
        /^www\./,
        "",
      );
    }
  } catch {
    // Quelle aus Discovery verwenden.
  }

  return (
    discovery.source ||
    "SaveWise"
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      backgroundColor:
        universeTheme.colors
          .background,
    },

    canvas: {
      alignSelf: "center",
      backgroundColor:
        universeTheme.colors
          .background,
      overflow: "hidden",
      position: "relative",
    },

    absoluteNode: {
      alignItems: "center",
      justifyContent:
        "center",
      position: "absolute",
      zIndex: 4,
    },

    flex: {
      flex: 1,
    },

    connection: {
      opacity: 0.88,
      position: "absolute",
      transformOrigin:
        "left center",
      zIndex: 1,
    },

    backgroundNebula: {
      backgroundColor:
        "rgba(0, 112, 192, 0.07)",
      borderRadius: 260,
      height: 520,
      left: "14%",
      position: "absolute",
      top: "10%",
      width: 520,
    },

    star: {
      backgroundColor:
        universeTheme.colors
          .primaryBright,
      borderRadius: 999,
      position: "absolute",
    },

    centerPulse: {
      backgroundColor:
        "rgba(56, 189, 248, 0.18)",
      borderColor:
        "rgba(103, 232, 249, 0.55)",
      borderRadius: 999,
      borderWidth: 1,
      bottom: -15,
      left: -15,
      position: "absolute",
      right: -15,
      top: -15,
    },

    centerNode: {
      alignItems: "center",
      backgroundColor:
        "#051426",
      borderColor:
        universeTheme.colors
          .primaryBright,
      borderRadius: 999,
      borderWidth: 2,
      flex: 1,
      justifyContent:
        "center",
      shadowColor:
        universeTheme.colors
          .primary,
      shadowOffset: {
        height: 0,
        width: 0,
      },
      shadowOpacity: 0.95,
      shadowRadius: 22,
      width: "100%",
    },

    centerLogo: {
      alignItems: "center",
      borderColor:
        universeTheme.colors
          .primary,
      borderRadius: 999,
      borderWidth: 2,
      height: 42,
      justifyContent:
        "center",
      width: 42,
    },

    centerLogoText: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 25,
      fontWeight: "800",
    },

    centerTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.2,
      marginTop: 6,
    },

    nodeBody: {
      alignItems: "center",
      borderWidth: 1.5,
      justifyContent:
        "center",
      shadowOffset: {
        height: 0,
        width: 0,
      },
      shadowOpacity: 0.78,
      shadowRadius: 13,
    },

    domainNode: {
      borderWidth: 1.8,
    },

    topicNode: {
      borderWidth: 1.5,
    },

    subtopicNode: {
      borderWidth: 1.2,
    },

    nodeSelected: {
      borderWidth: 2.3,
      shadowOpacity: 1,
      shadowRadius: 24,
    },

    nodeLabel: {
      color:
        universeTheme.colors
          .textSecondary,
      fontWeight: "700",
      marginTop: 7,
      maxWidth: 112,
      textAlign: "center",
    },

    domainLabel: {
      color:
        universeTheme.colors
          .text,
      fontSize: 11,
      lineHeight: 14,
    },

    topicLabel: {
      color:
        universeTheme.colors
          .text,
      fontSize: 10,
      lineHeight: 13,
    },

    subtopicLabel: {
      fontSize: 9,
      lineHeight: 11,
      maxWidth: 96,
    },

    nodeLabelSelected: {
      color:
        universeTheme.colors
          .text,
      fontSize: 13,
      fontWeight: "900",
      lineHeight: 16,
    },

    nodeBadge: {
      backgroundColor:
        "rgba(4, 12, 24, 0.92)",
      borderRadius: 999,
      borderWidth: 1,
      marginTop: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },

    nodeBadgeText: {
      fontSize: 8,
      fontWeight: "800",
    },

    nodePressed: {
      opacity: 0.65,
    },

    modePill: {
      alignItems: "center",
      backgroundColor:
        "rgba(8, 23, 40, 0.88)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 7,
      left: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
      position: "absolute",
      top: 14,
    },

    modePillText: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 0.8,
    },

    resetButton: {
      alignItems: "center",
      backgroundColor:
        "rgba(8, 23, 40, 0.88)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 7,
      position: "absolute",
      right: 16,
      top: 14,
    },

    resetButtonText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      fontWeight: "700",
    },

    legend: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor:
        "rgba(7, 17, 31, 0.92)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      marginBottom: 15,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },

    legendItem: {
      alignItems: "center",
      flexDirection: "row",
      gap: 5,
    },

    legendDivider: {
      backgroundColor:
        universeTheme.colors
          .border,
      height: 16,
      marginHorizontal: 10,
      width: 1,
    },

    legendText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      fontWeight: "700",
    },

    hintCard: {
      alignItems: "flex-start",
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
      flexDirection: "row",
      gap: 12,
      marginBottom: 20,
      marginHorizontal: 16,
      padding: 16,
    },

    hintTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 14,
      fontWeight: "700",
    },

    hintText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
    },

    detailCard: {
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
      padding: 18,
      shadowColor:
        universeTheme.colors
          .primary,
      shadowOffset: {
        height: 0,
        width: 0,
      },
      shadowOpacity: 0.22,
      shadowRadius: 18,
    },

    detailHeader: {
      alignItems:
        "flex-start",
      flexDirection: "row",
      gap: 12,
    },

    detailEyebrow: {
      color:
        universeTheme.colors
          .primary,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.4,
    },

    detailTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 23,
      fontWeight: "800",
      lineHeight: 29,
      marginTop: 4,
    },

    closeButton: {
      alignItems: "center",
      backgroundColor:
        "rgba(148, 163, 184, 0.08)",
      borderRadius: 999,
      height: 36,
      justifyContent:
        "center",
      width: 36,
    },

    metricRow: {
      borderBottomColor:
        universeTheme.colors
          .border,
      borderBottomWidth: 1,
      borderTopColor:
        universeTheme.colors
          .border,
      borderTopWidth: 1,
      flexDirection: "row",
      marginTop: 17,
      paddingVertical: 15,
    },

    detailMetric: {
      alignItems: "center",
      flex: 1,
    },

    detailMetricValue: {
      color:
        universeTheme.colors
          .text,
      fontSize: 15,
      fontWeight: "800",
      marginTop: 4,
    },

    detailMetricLabel: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      marginTop: 2,
      textAlign: "center",
    },

    topicList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 16,
    },

    topicPill: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.08)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 7,
      maxWidth: "100%",
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    topicDot: {
      backgroundColor:
        universeTheme.colors
          .primary,
      borderRadius: 999,
      height: 5,
      width: 5,
    },

    topicPillText: {
      color:
        universeTheme.colors
          .textSecondary,
      flexShrink: 1,
      fontSize: 11,
      fontWeight: "600",
    },

    discoverySection: {
      marginTop: 20,
    },

    discoverySectionTitle: {
      color:
        universeTheme.colors
          .primary,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
      marginBottom: 9,
    },

    discoveryRow: {
      alignItems: "center",
      borderBottomColor:
        universeTheme.colors
          .border,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 11,
      minHeight: 66,
      paddingVertical: 10,
    },

    discoveryIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.11)",
      borderRadius: 12,
      height: 38,
      justifyContent:
        "center",
      width: 38,
    },

    discoveryTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 18,
    },

    discoveryMeta: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 11,
      marginTop: 4,
    },

    emptyDetailText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 18,
    },
  });