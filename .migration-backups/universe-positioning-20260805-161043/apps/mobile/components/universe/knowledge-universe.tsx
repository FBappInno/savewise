
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
  PanResponder,
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

const WORLD_WIDTH = 1180;
const WORLD_HEIGHT = 900;
const MIN_SCALE = 0.55;
const MAX_SCALE = 1.45;

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

  const viewportHeight =
    screenWidth < 430
      ? 650
      : 720;

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

  const [
    scale,
    setScale,
  ] = useState(0.72);

  const pan =
    useRef(
      new Animated.ValueXY({
        x:
          screenWidth / 2 -
          WORLD_WIDTH *
            0.72 /
            2,

        y:
          viewportHeight / 2 -
          WORLD_HEIGHT *
            0.72 /
            2,
      }),
    ).current;

  const panOffset =
    useRef({
      x:
        screenWidth / 2 -
        WORLD_WIDTH *
          0.72 /
          2,

      y:
        viewportHeight / 2 -
        WORLD_HEIGHT *
          0.72 /
          2,
    });

  const gestureStart =
    useRef({
      x: 0,
      y: 0,
    });

  const layout =
    useUniverseLayout(
      graph,
      {
        width:
          WORLD_WIDTH,

        height:
          WORLD_HEIGHT,

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
        .slice(0, 8);
    }, [
      discoveries,
      selectedNode,
    ]);

  const panResponder =
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder:
            () => false,

          onMoveShouldSetPanResponder:
            (
              _event,
              gestureState,
            ) =>
              Math.abs(
                gestureState.dx,
              ) > 4 ||
              Math.abs(
                gestureState.dy,
              ) > 4,

          onPanResponderGrant: () => {
            gestureStart.current = {
              ...panOffset.current,
            };
          },

          onPanResponderMove: (
            _event,
            gestureState,
          ) => {
            const nextPosition = {
              x:
                gestureStart.current.x +
                gestureState.dx,

              y:
                gestureStart.current.y +
                gestureState.dy,
            };

            pan.setValue(
              nextPosition,
            );
          },

          onPanResponderRelease: (
            _event,
            gestureState,
          ) => {
            panOffset.current = {
              x:
                gestureStart.current.x +
                gestureState.dx,

              y:
                gestureStart.current.y +
                gestureState.dy,
            };
          },

          onPanResponderTerminate:
            (
              _event,
              gestureState,
            ) => {
              panOffset.current = {
                x:
                  gestureStart.current.x +
                  gestureState.dx,

                y:
                  gestureStart.current.y +
                  gestureState.dy,
              };
            },
        }),
      [pan],
    );

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
        resetUniverse();
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

      focusWorldCenter();
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

        focusWorldCenter();
        return;
      }

      setExpandedTopicId(
        node.id,
      );

      setSelectedNodeId(
        node.id,
      );

      focusWorldCenter();
      return;
    }

    setSelectedNodeId(
      node.id,
    );
  }

  function focusWorldCenter(
    nextScale = scale,
  ) {
    const nextPosition = {
      x:
        screenWidth / 2 -
        WORLD_WIDTH *
          nextScale /
          2,

      y:
        viewportHeight / 2 -
        WORLD_HEIGHT *
          nextScale /
          2,
    };

    panOffset.current =
      nextPosition;

    Animated.spring(
      pan,
      {
        toValue:
          nextPosition,

        useNativeDriver:
          false,

        friction: 8,
        tension: 55,
      },
    ).start();
  }

  function updateScale(
    nextScale: number,
  ) {
    const normalizedScale =
      Math.max(
        MIN_SCALE,
        Math.min(
          MAX_SCALE,
          Number(
            nextScale.toFixed(
              2,
            ),
          ),
        ),
      );

    setScale(
      normalizedScale,
    );

    focusWorldCenter(
      normalizedScale,
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

    const defaultScale =
      0.72;

    setScale(
      defaultScale,
    );

    focusWorldCenter(
      defaultScale,
    );
  }

  return (
    <View
      style={
        styles.wrapper
      }
    >
      <View
        style={[
          styles.viewport,

          {
            height:
              viewportHeight,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <StarField />

        <Animated.View
          style={[
            styles.world,

            {
              height:
                WORLD_HEIGHT,

              transform: [
                {
                  translateX:
                    pan.x,
                },

                {
                  translateY:
                    pan.y,
                },

                {
                  scale,
                },
              ],

              width:
                WORLD_WIDTH,
            },
          ]}
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

          <CenterNode
            onPress={
              resetUniverse
            }
            x={
              layout.center.x
            }
            y={
              layout.center.y
            }
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
        </Animated.View>

        <View
          pointerEvents="box-none"
          style={
            StyleSheet.absoluteFill
          }
        >
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

          <View
            style={
              styles.mapControls
            }
          >
            <Pressable
              accessibilityLabel="Hineinzoomen"
              accessibilityRole="button"
              onPress={() => {
                updateScale(
                  scale + 0.12,
                );
              }}
              style={({
                pressed,
              }) => [
                styles.mapControlButton,

                pressed &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                color={
                  universeTheme
                    .colors
                    .primaryBright
                }
                name="add"
                size={20}
              />
            </Pressable>

            <Pressable
              accessibilityLabel="Herauszoomen"
              accessibilityRole="button"
              onPress={() => {
                updateScale(
                  scale - 0.12,
                );
              }}
              style={({
                pressed,
              }) => [
                styles.mapControlButton,

                pressed &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                color={
                  universeTheme
                    .colors
                    .primaryBright
                }
                name="remove"
                size={20}
              />
            </Pressable>

            <Pressable
              accessibilityLabel="Karte zentrieren"
              accessibilityRole="button"
              onPress={() => {
                focusWorldCenter();
              }}
              style={({
                pressed,
              }) => [
                styles.mapControlButton,

                pressed &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                color={
                  universeTheme
                    .colors
                    .primaryBright
                }
                name="locate-outline"
                size={18}
              />
            </Pressable>

            <Pressable
              accessibilityLabel="Universum einklappen"
              accessibilityRole="button"
              onPress={
                resetUniverse
              }
              style={({
                pressed,
              }) => [
                styles.mapControlButton,

                pressed &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                color={
                  universeTheme
                    .colors
                    .primaryBright
                }
                name="contract-outline"
                size={18}
              />
            </Pressable>
          </View>

          <View
            style={
              styles.dragHint
            }
          >
            <Ionicons
              color={
                universeTheme.colors
                  .textMuted
              }
              name="hand-left-outline"
              size={14}
            />

            <Text
              style={
                styles.dragHintText
              }
            >
              Karte mit einem Finger
              verschieben
            </Text>
          </View>
        </View>
      </View>

      <HierarchyLegend />

      {selectedNode ? (
        <UniverseDetailCard
          discoveries={
            selectedDiscoveries
          }
          graph={graph}
          node={selectedNode}
          onClose={() => {
            setSelectedNodeId(
              null,
            );
          }}
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
              Tippe auf eine Domäne.
              Danach erscheinen ihre
              Topics. Ein Topic öffnet
              seine Unterthemen.
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
      inputRange: [
        0,
        1,
      ],
      outputRange: [
        1,
        1.08,
      ],
    });

  const opacity =
    pulse.interpolate({
      inputRange: [
        0,
        1,
      ],
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
          styles.pressed,
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
      Math.max(
        0,
        layoutNode.rootIndex,
      ),
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

  const opacity =
    layoutNode.isBackgroundNode
      ? 0.42
      : 1;

  return (
    <Pressable
      accessibilityLabel={
        `${getNodeLevelLabel(
          layoutNode.level,
        )}: ${
          layoutNode.node.title
        }`
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({
        pressed,
      }) => [
        styles.absoluteNode,

        {
          height:
            size + 74,

          left:
            layoutNode.position.x -
            (size + 74) / 2,

          opacity,

          top:
            layoutNode.position.y -
            (size + 74) / 2,

          width:
            size + 74,
        },

        pressed &&
          styles.pressed,
      ]}
    >
      <View
        style={[
          styles.nodeBody,

          {
            backgroundColor:
              `${color}20`,

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
          name={
            getNodeIcon(
              layoutNode,
            )
          }
          size={
            layoutNode.level ===
            "domain"
              ? 28
              : layoutNode.level ===
                  "topic"
                ? 23
                : 16
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
            {getNodeLevelLabel(
              layoutNode.level,
            )}
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
      Math.max(
        0,
        connection.rootIndex,
      ),
    );

  return (
    <View
      pointerEvents="none"
      style={[
        styles.connection,

        {
          backgroundColor:
            `${color}${
              connection.level ===
              "domain"
                ? "90"
                : connection.level ===
                    "topic"
                  ? "75"
                  : "58"
            }`,

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

          width: length,
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
            length: 82,
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

  onClose: () => void;

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
        : "Unterknoten";

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
              styles.pressed,
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
            .slice(0, 10)
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
            ZUGEHÖRIGE DISCOVERIES
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
                    styles.pressed,
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

  if (level === "domain") {
    return (
      (selected
        ? 92
        : 70) +
      growth
    );
  }

  if (level === "topic") {
    return (
      (selected
        ? 66
        : 50) +
      Math.min(
        growth,
        12,
      )
    );
  }

  return (
    (selected
      ? 42
      : 30) +
    Math.min(
      growth,
      8,
    )
  );
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
      Math.max(
        0,
        layoutNode.rootIndex,
      ) %
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
  if (level === "domain") {
    return "Domäne";
  }

  if (level === "topic") {
    return "Topic";
  }

  return "Unterthema";
}

function getGraphNodeLabel(
  node:
    KnowledgeGraphNode,
): string {
  if (node.kind === "domain") {
    return "Domäne";
  }

  if (node.kind === "topic") {
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
    // Discovery-Quelle verwenden.
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

    viewport: {
      backgroundColor:
        universeTheme.colors
          .background,
      overflow: "hidden",
      position: "relative",
      width: "100%",
    },

    world: {
      left: 0,
      position: "absolute",
      top: 0,
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
      borderRadius: 280,
      height: 560,
      left: "8%",
      position: "absolute",
      top: "8%",
      width: 560,
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
      maxWidth: 122,
      textAlign: "center",
    },

    domainLabel: {
      color:
        universeTheme.colors
          .text,
      fontSize: 12,
      lineHeight: 15,
    },

    topicLabel: {
      color:
        universeTheme.colors
          .text,
      fontSize: 11,
      lineHeight: 14,
    },

    subtopicLabel: {
      fontSize: 9,
      lineHeight: 11,
      maxWidth: 105,
    },

    nodeLabelSelected: {
      color:
        universeTheme.colors
          .text,
      fontSize: 14,
      fontWeight: "900",
      lineHeight: 17,
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

    pressed: {
      opacity: 0.65,
    },

    modePill: {
      alignItems: "center",
      backgroundColor:
        "rgba(8, 23, 40, 0.92)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 7,
      left: 14,
      paddingHorizontal: 11,
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
      letterSpacing: 0.7,
    },

    mapControls: {
      gap: 8,
      position: "absolute",
      right: 14,
      top: 14,
    },

    mapControlButton: {
      alignItems: "center",
      backgroundColor:
        "rgba(8, 23, 40, 0.94)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 12,
      borderWidth: 1,
      height: 38,
      justifyContent:
        "center",
      width: 38,
    },

    dragHint: {
      alignItems: "center",
      backgroundColor:
        "rgba(8, 23, 40, 0.9)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      bottom: 14,
      flexDirection: "row",
      gap: 6,
      left: 14,
      paddingHorizontal: 10,
      paddingVertical: 7,
      position: "absolute",
    },

    dragHintText: {
      color:
        universeTheme.colors
          .textMuted,
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
      marginTop: 12,
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
