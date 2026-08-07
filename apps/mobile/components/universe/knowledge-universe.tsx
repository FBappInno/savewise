import {
  Ionicons,
} from "@expo/vector-icons";

import type {
  Discovery,
  KnowledgeGraph,
  KnowledgeGraphNode,
} from "@savewise/shared";

import {
  useMemo,
  useState,
} from "react";

import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  universeTheme,
} from "@/theme/universe-theme";

type KnowledgeUniverseProps = {
  graph:
    KnowledgeGraph;

  discoveries:
    Discovery[];

  onOpenDiscovery:
    (discovery: Discovery) => void;
};

type DomainGalaxy = {
  node:
    KnowledgeGraphNode;

  count:
    number;

  discoveries:
    Discovery[];

  topics:
    TopicSystem[];
};

type TopicSystem = {
  node:
    KnowledgeGraphNode;

  count:
    number;

  discoveries:
    Discovery[];
};

type Point = {
  x: number;
  y: number;
};

const SCREEN_WIDTH =
  Dimensions.get(
    "window",
  ).width;

const GALAXY_WIDTH =
  Math.max(
    340,
    SCREEN_WIDTH - 32,
  );

const GALAXY_HEIGHT =
  Math.min(
    520,
    Math.max(
      420,
      GALAXY_WIDTH * 1.2,
    ),
  );

const CENTER_X =
  GALAXY_WIDTH / 2;

const CENTER_Y =
  GALAXY_HEIGHT / 2;

export function KnowledgeUniverse({
  graph,
  discoveries,
  onOpenDiscovery,
}: KnowledgeUniverseProps) {
  const [
    selectedDomainId,
    setSelectedDomainId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    selectedTopicId,
    setSelectedTopicId,
  ] =
    useState<string | null>(
      null,
    );

  const galaxies =
    useMemo(
      () =>
        buildDomainGalaxies(
          graph,
          discoveries,
        ),
      [
        graph,
        discoveries,
      ],
    );

  const selectedGalaxy =
    galaxies.find(
      (galaxy) =>
        galaxy.node.id ===
        selectedDomainId,
    ) ??
    null;

  const selectedTopic =
    selectedGalaxy
      ?.topics.find(
        (topic) =>
          topic.node.id ===
          selectedTopicId,
      ) ??
    null;

  const visibleDiscoveries =
    selectedTopic
      ? selectedTopic.discoveries
      : selectedGalaxy
        ? selectedGalaxy.discoveries
        : [];

  function openDomain(
    galaxy:
      DomainGalaxy,
  ) {
    setSelectedDomainId(
      galaxy.node.id,
    );

    setSelectedTopicId(
      null,
    );
  }

  function openTopic(
    topic:
      TopicSystem,
  ) {
    setSelectedTopicId(
      (current) =>
        current ===
        topic.node.id
          ? null
          : topic.node.id,
    );
  }

  function returnToOverview() {
    setSelectedDomainId(
      null,
    );

    setSelectedTopicId(
      null,
    );
  }

  if (
    galaxies.length ===
    0
  ) {
    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Ionicons
            color={
              universeTheme.colors
                .primaryBright
            }
            name="planet-outline"
            size={27}
          />
        </View>

        <Text style={styles.emptyTitle}>
          Noch kein Wissensuniversum
        </Text>

        <Text style={styles.emptyText}>
          Sobald SaveWise Wissen
          strukturiert hat, entstehen hier
          deine persönlichen Galaxien.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>
            {selectedGalaxy
              ? "DOMAIN EXPLORATION"
              : "KNOWLEDGE UNIVERSE"}
          </Text>

          <Text style={styles.title}>
            {selectedGalaxy
              ? selectedGalaxy.node.title
              : "Deine Wissensgalaxien"}
          </Text>

          <Text style={styles.subtitle}>
            {selectedGalaxy
              ? "Wähle ein Sonnensystem, um die zugehörigen Discoveries zu erkunden."
              : "Jede Galaxie entspricht einer Domäne. Mehr Wissen erzeugt eine größere Galaxie."}
          </Text>
        </View>

        {selectedGalaxy ? (
          <Pressable
            accessibilityRole="button"
            onPress={
              returnToOverview
            }
            style={({ pressed }) => [
              styles.backButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .primaryBright
              }
              name="arrow-back"
              size={17}
            />

            <Text style={styles.backButtonText}>
              Übersicht
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.universeCard}>
        <StarField />

        {!selectedGalaxy ? (
          <UniverseOverview
            galaxies={
              galaxies
            }
            onOpenDomain={
              openDomain
            }
          />
        ) : (
          <DomainFocus
            galaxy={
              selectedGalaxy
            }
            onOpenTopic={
              openTopic
            }
            selectedTopicId={
              selectedTopicId
            }
          />
        )}

        <View style={styles.hintBadge}>
          <Ionicons
            color={
              universeTheme.colors
                .textMuted
            }
            name={
              selectedGalaxy
                ? "git-network-outline"
                : "planet-outline"
            }
            size={13}
          />

          <Text style={styles.hintText}>
            {selectedGalaxy
              ? "Topic antippen"
              : "Domäne antippen"}
          </Text>
        </View>
      </View>

      {selectedGalaxy ? (
        <View style={styles.inspector}>
          <View style={styles.inspectorHeader}>
            <View style={styles.inspectorHeaderText}>
              <Text style={styles.eyebrow}>
                {selectedTopic
                  ? "SONNENSYSTEM"
                  : "DOMÄNEN-GALAXIE"}
              </Text>

              <Text style={styles.inspectorTitle}>
                {selectedTopic
                  ? selectedTopic.node.title
                  : selectedGalaxy.node.title}
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countValue}>
                {
                  visibleDiscoveries
                    .length
                }
              </Text>

              <Text style={styles.countLabel}>
                Inhalte
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={
              styles.topicRow
            }
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
          >
            <Pressable
              onPress={() => {
                setSelectedTopicId(
                  null,
                );
              }}
              style={[
                styles.topicChip,

                !selectedTopicId &&
                  styles.topicChipActive,
              ]}
            >
              <Text
                style={[
                  styles.topicChipText,

                  !selectedTopicId &&
                    styles.topicChipTextActive,
                ]}
              >
                Alle
              </Text>

              <Text
                style={[
                  styles.topicChipCount,

                  !selectedTopicId &&
                    styles.topicChipTextActive,
                ]}
              >
                {
                  selectedGalaxy
                    .count
                }
              </Text>
            </Pressable>

            {selectedGalaxy.topics.map(
              (topic) => {
                const active =
                  topic.node.id ===
                  selectedTopicId;

                return (
                  <Pressable
                    key={
                      topic.node.id
                    }
                    onPress={() => {
                      openTopic(
                        topic,
                      );
                    }}
                    style={[
                      styles.topicChip,

                      active &&
                        styles.topicChipActive,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.topicChipText,

                        active &&
                          styles.topicChipTextActive,
                      ]}
                    >
                      {
                        topic.node
                          .title
                      }
                    </Text>

                    <Text
                      style={[
                        styles.topicChipCount,

                        active &&
                          styles.topicChipTextActive,
                      ]}
                    >
                      {topic.count}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </ScrollView>

          <View style={styles.discoveryList}>
            {visibleDiscoveries
              .slice(0, 20)
              .map(
                (
                  discovery,
                  index,
                ) => (
                  <Pressable
                    key={
                      discovery.id
                    }
                    onPress={() => {
                      onOpenDiscovery(
                        discovery,
                      );
                    }}
                    style={({ pressed }) => [
                      styles.discoveryRow,

                      index > 0 &&
                        styles.discoveryBorder,

                      pressed &&
                        styles.discoveryPressed,
                    ]}
                  >
                    <View style={styles.discoveryIcon}>
                      <Ionicons
                        color={
                          universeTheme
                            .colors
                            .primaryBright
                        }
                        name={
                          getDiscoveryIcon(
                            discovery,
                          )
                        }
                        size={18}
                      />
                    </View>

                    <View style={styles.discoveryContent}>
                      <Text
                        numberOfLines={2}
                        style={styles.discoveryTitle}
                      >
                        {discovery.improvedTitle ||
                          discovery.title}
                      </Text>

                      {discovery.summary ? (
                        <Text
                          numberOfLines={2}
                          style={styles.discoverySummary}
                        >
                          {
                            discovery.summary
                          }
                        </Text>
                      ) : null}

                      <View style={styles.discoveryMeta}>
                        <Text style={styles.discoveryType}>
                          {getDiscoveryType(
                            discovery,
                          )}
                        </Text>

                        <Text style={styles.discoveryDate}>
                          {formatDate(
                            discovery.createdAt,
                          )}
                        </Text>
                      </View>
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

            {visibleDiscoveries.length ===
            0 ? (
              <View style={styles.noDiscoveries}>
                <Text style={styles.noDiscoveriesText}>
                  Für dieses Topic sind
                  noch keine Discoveries
                  vorhanden.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.overviewFooter}>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatValue}>
              {galaxies.length}
            </Text>

            <Text style={styles.overviewStatLabel}>
              Domänen
            </Text>
          </View>

          <View style={styles.overviewDivider} />

          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatValue}>
              {galaxies.reduce(
                (
                  total,
                  galaxy,
                ) =>
                  total +
                  galaxy.topics
                    .length,
                0,
              )}
            </Text>

            <Text style={styles.overviewStatLabel}>
              Topics
            </Text>
          </View>

          <View style={styles.overviewDivider} />

          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatValue}>
              {
                discoveries.length
              }
            </Text>

            <Text style={styles.overviewStatLabel}>
              Discoveries
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function UniverseOverview({
  galaxies,
  onOpenDomain,
}: {
  galaxies:
    DomainGalaxy[];

  onOpenDomain:
    (galaxy: DomainGalaxy) => void;
}) {
  const positions =
    createOverviewPositions(
      galaxies.length,
    );

  return (
    <View style={styles.scene}>
      {galaxies.map(
        (
          galaxy,
          index,
        ) => {
          const position =
            positions[index];

          if (!position) {
            return null;
          }

          const size =
            calculateDomainSize(
              galaxy.count,
            );

          return (
            <Pressable
              accessibilityLabel={
                galaxy.node.title
              }
              accessibilityRole="button"
              key={
                galaxy.node.id
              }
              onPress={() => {
                onOpenDomain(
                  galaxy,
                );
              }}
              style={({ pressed }) => [
                styles.absoluteNode,

                {
                  left:
                    position.x -
                    size / 2,

                  top:
                    position.y -
                    size / 2,

                  width:
                    size,

                  height:
                    size,
                },

                pressed &&
                  styles.nodePressed,
              ]}
            >
              <View
                style={[
                  styles.galaxyOuter,

                  {
                    borderRadius:
                      size / 2,

                    height:
                      size,

                    width:
                      size,
                  },
                ]}
              >
                <View
                  style={[
                    styles.galaxyNebula,

                    {
                      borderRadius:
                        size * 0.34,

                      height:
                        size * 0.68,

                      width:
                        size * 0.68,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.galaxyCore,

                      {
                        borderRadius:
                          size *
                          0.22,

                        height:
                          size *
                          0.44,

                        width:
                          size *
                          0.44,
                      },
                    ]}
                  >
                    <Text style={styles.galaxyCount}>
                      {galaxy.count}
                    </Text>
                  </View>
                </View>
              </View>

              <Text
                numberOfLines={2}
                style={styles.galaxyLabel}
              >
                {galaxy.node.title}
              </Text>
            </Pressable>
          );
        },
      )}
    </View>
  );
}

function DomainFocus({
  galaxy,
  selectedTopicId,
  onOpenTopic,
}: {
  galaxy:
    DomainGalaxy;

  selectedTopicId:
    string | null;

  onOpenTopic:
    (topic: TopicSystem) => void;
}) {
  const topicPositions =
    createTopicPositions(
      galaxy.topics.length,
    );

  const domainSize =
    Math.min(
      132,
      90 +
        Math.sqrt(
          galaxy.count,
        ) *
          7,
    );

  return (
    <View style={styles.scene}>
      <View
        pointerEvents="none"
        style={[
          styles.focusOrbit,
          styles.focusOrbitLarge,
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.focusOrbit,
          styles.focusOrbitMedium,
        ]}
      />

      <View
        style={[
          styles.focusDomain,

          {
            height:
              domainSize,

            left:
              CENTER_X -
              domainSize / 2,

            top:
              CENTER_Y -
              domainSize / 2,

            width:
              domainSize,

            borderRadius:
              domainSize / 2,
          },
        ]}
      >
        <View style={styles.focusDomainInner}>
          <Ionicons
            color="#E7FBFF"
            name="planet"
            size={24}
          />

          <Text style={styles.focusDomainCount}>
            {galaxy.count}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          style={styles.focusDomainLabel}
        >
          {galaxy.node.title}
        </Text>
      </View>

      {galaxy.topics.map(
        (
          topic,
          index,
        ) => {
          const position =
            topicPositions[
              index
            ];

          if (!position) {
            return null;
          }

          const active =
            topic.node.id ===
            selectedTopicId;

          const size =
            Math.min(
              64,
              42 +
                Math.sqrt(
                  topic.count,
                ) *
                  5,
            );

          const satellites =
            Math.min(
              topic.count,
              6,
            );

          return (
            <Pressable
              key={
                topic.node.id
              }
              onPress={() => {
                onOpenTopic(
                  topic,
                );
              }}
              style={({ pressed }) => [
                styles.topicSystem,

                {
                  left:
                    position.x -
                    size / 2,

                  top:
                    position.y -
                    size / 2,

                  width:
                    size,

                  height:
                    size,
                },

                active &&
                  styles.topicSystemActive,

                pressed &&
                  styles.nodePressed,
              ]}
            >
              <View
                style={[
                  styles.topicSystemCore,

                  active &&
                    styles.topicSystemCoreActive,
                ]}
              >
                <Text style={styles.topicSystemCount}>
                  {topic.count}
                </Text>
              </View>

              {Array.from({
                length:
                  satellites,
              }).map(
                (
                  _,
                  satelliteIndex,
                ) => {
                  const angle =
                    (
                      Math.PI *
                      2 *
                      satelliteIndex
                    ) /
                    Math.max(
                      satellites,
                      1,
                    );

                  const orbit =
                    size *
                    0.68;

                  return (
                    <View
                      key={
                        satelliteIndex
                      }
                      pointerEvents="none"
                      style={[
                        styles.satellite,

                        {
                          left:
                            size /
                              2 +
                            Math.cos(
                              angle,
                            ) *
                              orbit,

                          top:
                            size /
                              2 +
                            Math.sin(
                              angle,
                            ) *
                              orbit,
                        },
                      ]}
                    />
                  );
                },
              )}

              <Text
                numberOfLines={2}
                style={[
                  styles.topicSystemLabel,

                  active &&
                    styles.topicSystemLabelActive,
                ]}
              >
                {topic.node.title}
              </Text>
            </Pressable>
          );
        },
      )}
    </View>
  );
}

function buildDomainGalaxies(
  graph:
    KnowledgeGraph,

  discoveries:
    Discovery[],
): DomainGalaxy[] {
  const nodesById =
    new Map(
      graph.nodes.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

  const discoveryById =
    new Map(
      discoveries.map(
        (discovery) => [
          discovery.id,
          discovery,
        ],
      ),
    );

  const rootIds =
    new Set(
      graph.rootNodeIds,
    );

  const domains =
    graph.nodes
      .filter(
        (node) =>
          node.kind ===
            "domain" &&
          (
            rootIds.has(
              node.id,
            ) ||
            node.parentId ===
              null
          ) &&
          !isGenericDomain(
            node.title,
          ),
      )
      .sort(
        (
          left,
          right,
        ) =>
          collectNodeDiscoveryIds(
            right,
            nodesById,
          ).size -
          collectNodeDiscoveryIds(
            left,
            nodesById,
          ).size,
      );

  return domains.map(
    (domain) => {
      const domainIds =
        collectNodeDiscoveryIds(
          domain,
          nodesById,
        );

      const domainDiscoveries =
        mapDiscoveries(
          domainIds,
          discoveryById,
        );

      const topics =
        domain.childIds
          .map(
            (id) =>
              nodesById.get(
                id,
              ),
          )
          .filter(
            (
              node,
            ): node is KnowledgeGraphNode =>
              Boolean(node) &&
              node?.kind ===
                "topic",
          )
          .map(
            (topic) => {
              const ids =
                collectNodeDiscoveryIds(
                  topic,
                  nodesById,
                );

              const topicDiscoveries =
                mapDiscoveries(
                  ids,
                  discoveryById,
                );

              return {
                node:
                  topic,

                count:
                  topicDiscoveries
                    .length,

                discoveries:
                  topicDiscoveries,
              };
            },
          )
          .filter(
            (topic) =>
              topic.count >
              0,
          )
          .sort(
            (
              left,
              right,
            ) =>
              right.count -
              left.count,
          )
          .slice(
            0,
            10,
          );

      return {
        node:
          domain,

        count:
          domainDiscoveries
            .length,

        discoveries:
          domainDiscoveries,

        topics,
      };
    },
  );
}

function collectNodeDiscoveryIds(
  root:
    KnowledgeGraphNode,

  nodesById:
    Map<
      string,
      KnowledgeGraphNode
    >,
): Set<string> {
  const result =
    new Set<string>();

  const visited =
    new Set<string>();

  function visit(
    node:
      KnowledgeGraphNode,
  ) {
    if (
      visited.has(
        node.id,
      )
    ) {
      return;
    }

    visited.add(
      node.id,
    );

    for (
      const discoveryId
      of node.discoveryIds
    ) {
      result.add(
        discoveryId,
      );
    }

    for (
      const childId
      of node.childIds
    ) {
      const child =
        nodesById.get(
          childId,
        );

      if (child) {
        visit(
          child,
        );
      }
    }
  }

  visit(
    root,
  );

  return result;
}

function mapDiscoveries(
  ids:
    Set<string>,

  discoveryById:
    Map<
      string,
      Discovery
    >,
): Discovery[] {
  return [...ids]
    .map(
      (id) =>
        discoveryById.get(
          id,
        ),
    )
    .filter(
      (
        discovery,
      ): discovery is Discovery =>
        Boolean(
          discovery,
        ),
    )
    .sort(
      (
        left,
        right,
      ) =>
        new Date(
          right.createdAt,
        ).getTime() -
        new Date(
          left.createdAt,
        ).getTime(),
    );
}

function createOverviewPositions(
  count: number,
): Point[] {
  if (
    count === 1
  ) {
    return [
      {
        x:
          CENTER_X,

        y:
          CENTER_Y,
      },
    ];
  }

  return Array.from({
    length:
      count,
  }).map(
    (
      _,
      index,
    ) => {
      const angle =
        (
          Math.PI *
          2 *
          index
        ) /
          count -
        Math.PI / 2;

      const ring =
        count <= 6
          ? Math.min(
              GALAXY_WIDTH *
                0.34,
              135,
            )
          : index % 2 ===
              0
            ? Math.min(
                GALAXY_WIDTH *
                  0.29,
                118,
              )
            : Math.min(
                GALAXY_WIDTH *
                  0.42,
                168,
              );

      return {
        x:
          CENTER_X +
          Math.cos(
            angle,
          ) *
            ring,

        y:
          CENTER_Y +
          Math.sin(
            angle,
          ) *
            ring *
            1.25,
      };
    },
  );
}

function createTopicPositions(
  count: number,
): Point[] {
  return Array.from({
    length:
      count,
  }).map(
    (
      _,
      index,
    ) => {
      const angle =
        (
          Math.PI *
          2 *
          index
        ) /
          Math.max(
            count,
            1,
          ) -
        Math.PI / 2;

      const ring =
        index % 2 ===
          0
          ? Math.min(
              GALAXY_WIDTH *
                0.32,
              126,
            )
          : Math.min(
              GALAXY_WIDTH *
                0.43,
              166,
            );

      return {
        x:
          CENTER_X +
          Math.cos(
            angle,
          ) *
            ring,

        y:
          CENTER_Y +
          Math.sin(
            angle,
          ) *
            ring *
            1.25,
      };
    },
  );
}

function calculateDomainSize(
  count: number,
): number {
  return Math.min(
    82,
    44 +
      Math.sqrt(
        Math.max(
          count,
          1,
        ),
      ) *
        7,
  );
}

function isGenericDomain(
  value: string,
): boolean {
  const normalized =
    value
      .trim()
      .toLocaleLowerCase();

  return (
    normalized ===
      "other" ||
    normalized ===
      "others" ||
    normalized ===
      "weitere" ||
    normalized ===
      "miscellaneous" ||
    normalized ===
      "uncategorized"
  );
}

function getDiscoveryIcon(
  discovery:
    Discovery,
):
  | "document-text-outline"
  | "image-outline"
  | "link-outline" {
  if (
    discovery.attachment
      ?.captureType ===
    "pdf"
  ) {
    return "document-text-outline";
  }

  if (
    discovery.attachment
      ?.captureType ===
    "image"
  ) {
    return "image-outline";
  }

  return "link-outline";
}

function getDiscoveryType(
  discovery:
    Discovery,
): string {
  if (
    discovery.attachment
      ?.captureType ===
    "pdf"
  ) {
    return "PDF";
  }

  if (
    discovery.attachment
      ?.captureType ===
    "image"
  ) {
    return "Bild";
  }

  if (
    discovery.captureType ===
    "note"
  ) {
    return "Notiz";
  }

  return "Link";
}

function formatDate(
  value: string,
): string {
  return new Date(
    value,
  ).toLocaleDateString(
    "de-CH",
    {
      day:
        "2-digit",

      month:
        "short",
    },
  );
}

function StarField() {
  const stars =
    useMemo(
      () =>
        Array.from({
          length:
            42,
        }).map(
          (
            _,
            index,
          ) => ({
            id:
              index,

            left:
              (
                (
                  index *
                  79
                ) %
                97
              ) /
              100 *
              GALAXY_WIDTH,

            top:
              (
                (
                  index *
                  47
                ) %
                93
              ) /
              100 *
              GALAXY_HEIGHT,

            size:
              index % 7 ===
                0
                ? 2.2
                : 1.2,
          }),
        ),
      [],
    );

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {stars.map(
        (star) => (
          <View
            key={
              star.id
            }
            style={[
              styles.star,

              {
                height:
                  star.size,

                left:
                  star.left,

                top:
                  star.top,

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

const styles =
  StyleSheet.create({
    wrapper: {
      gap:
        14,
    },

    header: {
      alignItems:
        "flex-start",

      flexDirection:
        "row",

      gap:
        10,

      justifyContent:
        "space-between",
    },

    headerText: {
      flex:
        1,
    },

    eyebrow: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        10,

      fontWeight:
        "800",

      letterSpacing:
        1.15,
    },

    title: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        22,

      fontWeight:
        "800",

      letterSpacing:
        -0.7,

      marginTop:
        5,
    },

    subtitle: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        13,

      lineHeight:
        19,

      marginTop:
        6,

      maxWidth:
        330,
    },

    backButton: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.09)",

      borderColor:
        "rgba(115, 216, 255, 0.26)",

      borderRadius:
        11,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        5,

      marginTop:
        1,

      minHeight:
        38,

      paddingHorizontal:
        10,
    },

    backButtonText: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        12,

      fontWeight:
        "800",
    },

    universeCard: {
      backgroundColor:
        "#020B14",

      borderColor:
        "rgba(115, 216, 255, 0.15)",

      borderRadius:
        22,

      borderWidth:
        1,

      height:
        GALAXY_HEIGHT,

      overflow:
        "hidden",

      position:
        "relative",
    },

    scene: {
      height:
        GALAXY_HEIGHT,

      position:
        "relative",

      width:
        GALAXY_WIDTH,
    },

    star: {
      backgroundColor:
        "#C8F4FF",

      borderRadius:
        999,

      opacity:
        0.27,

      position:
        "absolute",
    },

    absoluteNode: {
      alignItems:
        "center",

      justifyContent:
        "center",

      position:
        "absolute",
    },

    nodePressed: {
      opacity:
        0.72,

      transform: [
        {
          scale:
            0.96,
        },
      ],
    },

    galaxyOuter: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.035)",

      borderColor:
        "rgba(115, 216, 255, 0.19)",

      borderWidth:
        1,

      justifyContent:
        "center",

      shadowColor:
        "#38BDF8",

      shadowOffset: {
        width:
          0,

        height:
          0,
      },

      shadowOpacity:
        0.34,

      shadowRadius:
        15,
    },

    galaxyNebula: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(42, 181, 227, 0.13)",

      borderColor:
        "rgba(115, 216, 255, 0.25)",

      borderWidth:
        1,

      justifyContent:
        "center",
    },

    galaxyCore: {
      alignItems:
        "center",

      backgroundColor:
        "#51C8EE",

      borderColor:
        "#DDF9FF",

      borderWidth:
        1,

      justifyContent:
        "center",

      shadowColor:
        "#73D8FF",

      shadowOpacity:
        0.95,

      shadowRadius:
        13,
    },

    galaxyCount: {
      color:
        "#04131D",

      fontSize:
        12,

      fontWeight:
        "900",
    },

    galaxyLabel: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        10,

      fontWeight:
        "800",

      left:
        -28,

      lineHeight:
        13,

      marginTop:
        5,

      position:
        "absolute",

      textAlign:
        "center",

      top:
        "100%",

      width:
        112,
    },

    focusOrbit: {
      borderColor:
        "rgba(115, 216, 255, 0.09)",

      borderRadius:
        999,

      borderStyle:
        "dashed",

      borderWidth:
        1,

      left:
        "50%",

      position:
        "absolute",

      top:
        "50%",
    },

    focusOrbitLarge: {
      height:
        330,

      marginLeft:
        -165,

      marginTop:
        -165,

      width:
        330,
    },

    focusOrbitMedium: {
      height:
        230,

      marginLeft:
        -115,

      marginTop:
        -115,

      width:
        230,
    },

    focusDomain: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(48, 178, 222, 0.13)",

      borderColor:
        "rgba(184, 244, 255, 0.38)",

      borderWidth:
        1,

      justifyContent:
        "center",

      position:
        "absolute",

      shadowColor:
        "#48C7EF",

      shadowOpacity:
        0.75,

      shadowRadius:
        23,
    },

    focusDomainInner: {
      alignItems:
        "center",

      backgroundColor:
        "#168DBB",

      borderColor:
        "#E7FBFF",

      borderRadius:
        999,

      borderWidth:
        1,

      gap:
        1,

      height:
        62,

      justifyContent:
        "center",

      width:
        62,
    },

    focusDomainCount: {
      color:
        "#FFFFFF",

      fontSize:
        13,

      fontWeight:
        "900",
    },

    focusDomainLabel: {
      color:
        "#F0FBFF",

      fontSize:
        13,

      fontWeight:
        "800",

      left:
        -25,

      lineHeight:
        16,

      position:
        "absolute",

      textAlign:
        "center",

      top:
        "100%",

      width:
        150,
    },

    topicSystem: {
      alignItems:
        "center",

      borderColor:
        "rgba(115, 216, 255, 0.19)",

      borderRadius:
        999,

      borderWidth:
        1,

      justifyContent:
        "center",

      position:
        "absolute",
    },

    topicSystemActive: {
      backgroundColor:
        "rgba(56, 189, 248, 0.1)",

      borderColor:
        universeTheme.colors
          .primaryBright,

      borderWidth:
        2,
    },

    topicSystemCore: {
      alignItems:
        "center",

      backgroundColor:
        "#65D5F5",

      borderColor:
        "#E5FAFF",

      borderRadius:
        999,

      borderWidth:
        1,

      height:
        "65%",

      justifyContent:
        "center",

      shadowColor:
        "#6BD9F8",

      shadowOpacity:
        0.7,

      shadowRadius:
        10,

      width:
        "65%",
    },

    topicSystemCoreActive: {
      backgroundColor:
        "#9BE9FF",
    },

    topicSystemCount: {
      color:
        "#04131D",

      fontSize:
        11,

      fontWeight:
        "900",
    },

    topicSystemLabel: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        9,

      fontWeight:
        "700",

      left:
        -34,

      lineHeight:
        12,

      position:
        "absolute",

      textAlign:
        "center",

      top:
        "110%",

      width:
        120,
    },

    topicSystemLabelActive: {
      color:
        universeTheme.colors
          .primaryBright,
    },

    satellite: {
      backgroundColor:
        "#DDF9FF",

      borderRadius:
        999,

      height:
        4,

      position:
        "absolute",

      shadowColor:
        "#A3ECFF",

      shadowOpacity:
        0.9,

      shadowRadius:
        4,

      width:
        4,
    },

    hintBadge: {
      alignItems:
        "center",

      alignSelf:
        "center",

      backgroundColor:
        "rgba(2, 10, 18, 0.78)",

      borderColor:
        "rgba(115, 216, 255, 0.12)",

      borderRadius:
        999,

      borderWidth:
        1,

      bottom:
        10,

      flexDirection:
        "row",

      gap:
        5,

      paddingHorizontal:
        9,

      paddingVertical:
        6,

      position:
        "absolute",
    },

    hintText: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        10,

      fontWeight:
        "600",
    },

    inspector: {
      backgroundColor:
        "rgba(8, 24, 39, 0.92)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        18,

      borderWidth:
        1,

      overflow:
        "hidden",

      padding:
        15,
    },

    inspectorHeader: {
      alignItems:
        "center",

      flexDirection:
        "row",

      gap:
        12,

      justifyContent:
        "space-between",
    },

    inspectorHeaderText: {
      flex:
        1,
    },

    inspectorTitle: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        19,

      fontWeight:
        "800",

      marginTop:
        4,
    },

    countBadge: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.08)",

      borderColor:
        "rgba(115, 216, 255, 0.16)",

      borderRadius:
        11,

      borderWidth:
        1,

      minWidth:
        58,

      paddingHorizontal:
        9,

      paddingVertical:
        7,
    },

    countValue: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        17,

      fontWeight:
        "900",
    },

    countLabel: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        9,
    },

    topicRow: {
      gap:
        7,

      paddingRight:
        20,

      paddingVertical:
        14,
    },

    topicChip: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.045)",

      borderColor:
        "rgba(115, 216, 255, 0.13)",

      borderRadius:
        999,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        6,

      maxWidth:
        180,

      paddingHorizontal:
        10,

      paddingVertical:
        8,
    },

    topicChipActive: {
      backgroundColor:
        "rgba(56, 189, 248, 0.14)",

      borderColor:
        universeTheme.colors
          .primaryBright,
    },

    topicChipText: {
      color:
        universeTheme.colors
          .textSecondary,

      flexShrink:
        1,

      fontSize:
        11,

      fontWeight:
        "700",
    },

    topicChipTextActive: {
      color:
        universeTheme.colors
          .primaryBright,
    },

    topicChipCount: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        10,

      fontWeight:
        "900",
    },

    discoveryList: {
      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        13,

      borderWidth:
        1,

      overflow:
        "hidden",
    },

    discoveryRow: {
      alignItems:
        "center",

      flexDirection:
        "row",

      gap:
        10,

      minHeight:
        88,

      padding:
        11,
    },

    discoveryBorder: {
      borderTopColor:
        universeTheme.colors
          .border,

      borderTopWidth:
        StyleSheet.hairlineWidth,
    },

    discoveryPressed: {
      backgroundColor:
        "rgba(56, 189, 248, 0.07)",
    },

    discoveryIcon: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.08)",

      borderColor:
        "rgba(115, 216, 255, 0.13)",

      borderRadius:
        10,

      borderWidth:
        1,

      height:
        38,

      justifyContent:
        "center",

      width:
        38,
    },

    discoveryContent: {
      flex:
        1,
    },

    discoveryTitle: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        13,

      fontWeight:
        "800",

      lineHeight:
        17,
    },

    discoverySummary: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        10,

      lineHeight:
        14,

      marginTop:
        4,
    },

    discoveryMeta: {
      alignItems:
        "center",

      flexDirection:
        "row",

      gap:
        8,

      marginTop:
        5,
    },

    discoveryType: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        9,

      fontWeight:
        "800",
    },

    discoveryDate: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        9,
    },

    noDiscoveries: {
      padding:
        20,
    },

    noDiscoveriesText: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        12,

      lineHeight:
        17,

      textAlign:
        "center",
    },

    overviewFooter: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(8, 24, 39, 0.8)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        15,

      borderWidth:
        1,

      flexDirection:
        "row",

      justifyContent:
        "space-around",

      minHeight:
        70,
    },

    overviewStat: {
      alignItems:
        "center",

      flex:
        1,
    },

    overviewStatValue: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        18,

      fontWeight:
        "900",
    },

    overviewStatLabel: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        10,

      marginTop:
        2,
    },

    overviewDivider: {
      backgroundColor:
        universeTheme.colors
          .border,

      height:
        28,

      width:
        StyleSheet.hairlineWidth,
    },

    emptyCard: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(8, 24, 39, 0.8)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        18,

      borderWidth:
        1,

      justifyContent:
        "center",

      minHeight:
        260,

      padding:
        30,
    },

    emptyIcon: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.08)",

      borderRadius:
        999,

      height:
        58,

      justifyContent:
        "center",

      width:
        58,
    },

    emptyTitle: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        18,

      fontWeight:
        "800",

      marginTop:
        15,
    },

    emptyText: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        12,

      lineHeight:
        18,

      marginTop:
        7,

      textAlign:
        "center",
    },

    pressed: {
      opacity:
        0.72,
    },
  });
