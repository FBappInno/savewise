"use client";

import type {
  Discovery,
  KnowledgeGraph,
} from "@savewise/shared";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useDiscoveries,
} from "@/providers/discovery-provider";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

import {
  getKnowledgeLibrary,
} from "@/services/knowledge-client";

import {
  rebuildKnowledgeLibrary,
} from "@/services/knowledge-client";

type TopicSystem = {
  id: string;
  label: string;
  count: number;
  discoveries: Discovery[];
};

type DomainGalaxy = {
  id: string;
  key: string;
  label: string;
  count: number;
  discoveries: Discovery[];
  topics: TopicSystem[];

  /*
   * Nur für die räumliche Darstellung.
   * KEINE zusätzliche Wissensebene.
   */
  clusterId: string;
};

type OverviewPosition = {
  x: number;
  y: number;
  radius: number;
};

const WIDTH =
  1200;

const HEIGHT =
  720;

const CENTER_X =
  WIDTH / 2;

const CENTER_Y =
  HEIGHT / 2;

export function KnowledgeGalaxy({
  onOpenDiscovery,
}: {
  onOpenDiscovery:
    (discovery: Discovery) => void;
}) {
  const {
    workspaceDiscoveries,
    isLoading,
  } =
    useDiscoveries();

  const {
    activeWorkspaceId,
  } =
    useWorkspace();

  const [
    isSynchronizing,
    setSynchronizing,
  ] =
    useState(false);

  const [
    knowledgeGraph,
    setKnowledgeGraph,
  ] =
    useState<KnowledgeGraph | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    async function loadGraph():
    Promise<void> {
      try {
        const library =
          await getKnowledgeLibrary(
            activeWorkspaceId,
          );

        if (active) {
          setKnowledgeGraph(
            library.graph,
          );
        }
      } catch {
        /*
         * Das Universum funktioniert
         * weiterhin mit den Discoveries,
         * falls der KI-Graph temporär
         * nicht verfügbar ist.
         */
        if (active) {
          setKnowledgeGraph(null);
        }
      }
    }

    void loadGraph();

    return () => {
      active = false;
    };
  }, [activeWorkspaceId]);

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
        createDomainGalaxies(
          workspaceDiscoveries,
          knowledgeGraph,
        ),
      [
        knowledgeGraph,
        workspaceDiscoveries,
      ],
    );

  const selectedGalaxy =
    galaxies.find(
      (galaxy) =>
        galaxy.id ===
        selectedDomainId,
    ) ??
    null;

  const selectedTopic =
    selectedGalaxy
      ?.topics.find(
        (topic) =>
          topic.id ===
          selectedTopicId,
      ) ??
    null;

  const inspectorDiscoveries =
    selectedTopic
      ? selectedTopic.discoveries
      : selectedGalaxy
        ? selectedGalaxy.discoveries
        : [];

  const overviewPositions =
    useMemo(
      () =>
        createOverviewPositions(
          galaxies,
        ),
      [galaxies],
    );

  function selectDomain(
    galaxy:
      DomainGalaxy,
  ): void {
    setSelectedDomainId(
      galaxy.id,
    );

    setSelectedTopicId(
      null,
    );
  }

  function selectTopic(
    topic:
      TopicSystem,
  ): void {
    setSelectedTopicId(
      (current) =>
        current ===
        topic.id
          ? null
          : topic.id,
    );
  }

  async function synchronizeUniverse():
  Promise<void> {
    setSynchronizing(true);

    try {
      await rebuildKnowledgeLibrary(
        activeWorkspaceId,
      );

      /*
       * Discoveries bilden die sichtbare
       * Galaxie direkt. Reload stellt sicher,
       * dass auch alle Provider denselben
       * aktuellen Stand besitzen.
       */
      window.location.reload();
    } finally {
      setSynchronizing(false);
    }
  }

  function returnToOverview():
  void {
    setSelectedDomainId(
      null,
    );

    setSelectedTopicId(
      null,
    );
  }

  if (
    isLoading &&
    workspaceDiscoveries.length ===
      0
  ) {
    return (
      <div className="galaxy-loading">
        <div className="galaxy-loading-core" />

        <p>
          Wissensuniversum wird aufgebaut …
        </p>
      </div>
    );
  }

  if (
    workspaceDiscoveries.length ===
    0
  ) {
    return (
      <div className="universe-empty galaxy-empty">
        <div className="empty-icon">
          ✦
        </div>

        <h3>
          Noch keine Galaxien
        </h3>

        <p>
          Sobald du Inhalte erfasst,
          entstehen hier automatisch
          Domänen, Themen und
          Wissensverbindungen.
        </p>
      </div>
    );
  }

  return (
    <section className="galaxy-layout">
      <div className="galaxy-stage">
        <div className="galaxy-stage-header">
          <div>
            <div className="card-eyebrow">
              {selectedGalaxy
                ? "GALAXY EXPLORATION"
                : "KNOWLEDGE UNIVERSE"}
            </div>

            <h2>
              {selectedGalaxy
                ? selectedGalaxy.label
                : "Deine Wissensgalaxien"}
            </h2>

            <p>
              {selectedGalaxy
                ? "Wähle einen Planeten, um die zugehörigen Sterne und Discoveries zu erkunden."
                : "SaveWise führt gleichbedeutende Galaxien zusammen und ordnet verwandte Wissensbereiche räumlich in KI-Clustern an."}
            </p>
          </div>

          {selectedGalaxy ? (
            <button
              className="galaxy-overview-button"
              onClick={
                returnToOverview
              }
              type="button"
            >
              <span>
                ←
              </span>

              Zur Hauptansicht
            </button>
          ) : (
            <div
              style={{
                alignItems: "center",
                display: "flex",
                gap: "14px",
              }}
            >
              <button
                className="galaxy-overview-button"
                disabled={
                  isSynchronizing
                }
                onClick={() => {
                  void synchronizeUniverse();
                }}
                type="button"
              >
                {isSynchronizing
                  ? "✦ Synchronisiere …"
                  : "✦ Universum synchronisieren"}
              </button>

              <div className="galaxy-statistics">
              <div>
                <strong>
                  {galaxies.length}
                </strong>

                <span>
                  Galaxien
                </span>
              </div>

              <div>
                <strong>
                  {
                    galaxies.reduce(
                      (
                        total,
                        galaxy,
                      ) =>
                        total +
                        galaxy.topics.length,
                      0,
                    )
                  }
                </strong>

                <span>
                  Planeten
                </span>
              </div>

              <div>
                <strong>
                  {
                    workspaceDiscoveries
                      .length
                  }
                </strong>

                <span>
                  Inhalte
                </span>
              </div>
              </div>
            </div>
          )}
        </div>

        <div
          className={
            selectedGalaxy
              ? "galaxy-canvas-wrapper galaxy-canvas-wrapper-focused"
              : "galaxy-canvas-wrapper"
          }
        >
          <div className="galaxy-stars" />

          <svg
            aria-label="Interaktives Wissensuniversum"
            className="galaxy-canvas"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            <defs>
              <radialGradient
                id="domain-galaxy-gradient"
              >
                <stop
                  offset="0%"
                  stopColor="#e8fbff"
                />

                <stop
                  offset="22%"
                  stopColor="#91e6ff"
                />

                <stop
                  offset="56%"
                  stopColor="#209ccc"
                />

                <stop
                  offset="100%"
                  stopColor="#07324a"
                />
              </radialGradient>

              <radialGradient
                id="focused-domain-gradient"
              >
                <stop
                  offset="0%"
                  stopColor="#ffffff"
                />

                <stop
                  offset="18%"
                  stopColor="#bff3ff"
                />

                <stop
                  offset="48%"
                  stopColor="#45c6ef"
                />

                <stop
                  offset="100%"
                  stopColor="#075277"
                />
              </radialGradient>

              <radialGradient
                id="topic-system-gradient"
              >
                <stop
                  offset="0%"
                  stopColor="#ffffff"
                />

                <stop
                  offset="38%"
                  stopColor="#9be9ff"
                />

                <stop
                  offset="100%"
                  stopColor="#1686b3"
                />
              </radialGradient>

              <filter
                height="500%"
                id="domain-galaxy-glow"
                width="500%"
                x="-200%"
                y="-200%"
              >
                <feGaussianBlur
                  result="blur"
                  stdDeviation="13"
                />

                <feMerge>
                  <feMergeNode
                    in="blur"
                  />

                  <feMergeNode
                    in="SourceGraphic"
                  />
                </feMerge>
              </filter>

              <filter
                height="500%"
                id="topic-system-glow"
                width="500%"
                x="-200%"
                y="-200%"
              >
                <feGaussianBlur
                  result="blur"
                  stdDeviation="7"
                />

                <feMerge>
                  <feMergeNode
                    in="blur"
                  />

                  <feMergeNode
                    in="SourceGraphic"
                  />
                </feMerge>
              </filter>
            </defs>

            {!selectedGalaxy ? (
              <g className="galaxy-overview-scene">
                {galaxies.map(
                  (
                    galaxy,
                    index,
                  ) => {
                    const position =
                      overviewPositions[
                        index
                      ];

                    if (!position) {
                      return null;
                    }

                    return (
                      <g
                        className="domain-galaxy domain-galaxy-overview"
                        key={
                          galaxy.id
                        }
                        onClick={() => {
                          selectDomain(
                            galaxy,
                          );
                        }}
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                              "Enter" ||
                            event.key ===
                              " "
                          ) {
                            event.preventDefault();

                            selectDomain(
                              galaxy,
                            );
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <circle
                          className="domain-galaxy-outer"
                          cx={
                            position.x
                          }
                          cy={
                            position.y
                          }
                          r={
                            position.radius *
                            1.62
                          }
                        />

                        <ellipse
                          className="domain-galaxy-disc"
                          cx={
                            position.x
                          }
                          cy={
                            position.y
                          }
                          rx={
                            position.radius *
                            1.42
                          }
                          ry={
                            position.radius *
                            0.46
                          }
                          transform={`rotate(${
                            -18 +
                            index *
                              7
                          } ${position.x} ${position.y})`}
                        />

                        <circle
                          className="domain-galaxy-nebula"
                          cx={
                            position.x
                          }
                          cy={
                            position.y
                          }
                          r={
                            position.radius *
                            1.18
                          }
                        />

                        <circle
                          className="domain-galaxy-core"
                          cx={
                            position.x
                          }
                          cy={
                            position.y
                          }
                          r={
                            position.radius
                          }
                        />

                        <text
                          className="domain-galaxy-count"
                          textAnchor="middle"
                          x={
                            position.x
                          }
                          y={
                            position.y +
                            6
                          }
                        >
                          {
                            galaxy.count
                          }
                        </text>

                        <text
                          className="domain-galaxy-label"
                          textAnchor="middle"
                          x={
                            position.x
                          }
                          y={
                            position.y +
                            position.radius +
                            29
                          }
                        >
                          {
                            galaxy.label
                          }
                        </text>
                      </g>
                    );
                  },
                )}
              </g>
            ) : (
              <FocusedDomainScene
                galaxy={
                  selectedGalaxy
                }
                selectedTopicId={
                  selectedTopicId
                }
                onSelectTopic={
                  selectTopic
                }
              />
            )}
          </svg>

          <div className="galaxy-control-hint">
            {selectedGalaxy
              ? "Sonnensystem anklicken, um seine Discoveries zu filtern"
              : "Galaxie anklicken, um die Domäne zu erkunden"}
          </div>
        </div>
      </div>

      <aside className="galaxy-inspector">
        {selectedGalaxy ? (
          <>
            <div className="card-eyebrow">
              {selectedTopic
                ? "SONNENSYSTEM"
                : "DOMÄNEN-GALAXIE"}
            </div>

            <h3>
              {selectedTopic
                ? selectedTopic.label
                : selectedGalaxy.label}
            </h3>

            <div className="galaxy-inspector-count">
              <strong>
                {
                  inspectorDiscoveries
                    .length
                }
              </strong>

              <span>
                {inspectorDiscoveries.length ===
                1
                  ? "Discovery"
                  : "Discoveries"}
              </span>
            </div>

            <div className="galaxy-topic-overview">
              <button
                className={
                  !selectedTopicId
                    ? "galaxy-topic-filter galaxy-topic-filter-active"
                    : "galaxy-topic-filter"
                }
                onClick={() => {
                  setSelectedTopicId(
                    null,
                  );
                }}
                type="button"
              >
                Alle
                <b>
                  {
                    selectedGalaxy
                      .count
                  }
                </b>
              </button>

              {selectedGalaxy.topics.map(
                (topic) => (
                  <button
                    className={
                      selectedTopicId ===
                      topic.id
                        ? "galaxy-topic-filter galaxy-topic-filter-active"
                        : "galaxy-topic-filter"
                    }
                    key={
                      topic.id
                    }
                    onClick={() => {
                      selectTopic(
                        topic,
                      );
                    }}
                    type="button"
                  >
                    {topic.label}

                    <b>
                      {topic.count}
                    </b>
                  </button>
                ),
              )}
            </div>

            <div className="galaxy-inspector-list">
              {inspectorDiscoveries
                .slice(0, 20)
                .map(
                  (discovery) => (
                    <button
                      className="galaxy-discovery-button"
                      key={
                        discovery.id
                      }
                      onClick={() => {
                        onOpenDiscovery(
                          discovery,
                        );
                      }}
                      type="button"
                    >
                      <strong>
                        {discovery
                          .improvedTitle ||
                          discovery.title}
                      </strong>

                      {discovery.summary ? (
                        <p>
                          {
                            discovery
                              .summary
                          }
                        </p>
                      ) : null}

                      <span>
                        Öffnen →
                      </span>
                    </button>
                  ),
                )}
            </div>

            {inspectorDiscoveries.length >
            20 ? (
              <div className="galaxy-inspector-more">
                +
                {inspectorDiscoveries.length -
                  20}{" "}
                weitere Discoveries
              </div>
            ) : null}
          </>
        ) : (
          <div className="galaxy-inspector-empty">
            <div className="galaxy-inspector-symbol">
              ✦
            </div>

            <h3>
              Galaxie auswählen
            </h3>

            <p>
              Wähle links eine Domäne.
              Sie wird anschließend im
              Zentrum geöffnet und in
              ihre Sonnensysteme
              aufgeteilt.
            </p>

            <div className="galaxy-legend">
              <div>
                <span className="legend-node legend-node-core" />

                Domänen-Galaxie
              </div>

              <div>
                <span className="legend-node legend-node-domain" />

                Topic-Sonnensystem
              </div>

              <div>
                <span className="legend-node legend-node-topic" />

                Discoveries
              </div>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}

function FocusedDomainScene({
  galaxy,
  selectedTopicId,
  onSelectTopic,
}: {
  galaxy:
    DomainGalaxy;

  selectedTopicId:
    string | null;

  onSelectTopic:
    (topic: TopicSystem) => void;
}) {
  const topicPositions =
    createFocusedTopicPositions(
      galaxy.topics,
    );

  const domainRadius =
    Math.min(
      106,
      68 +
        Math.sqrt(
          galaxy.count,
        ) *
          7,
    );

  return (
    <g className="focused-domain-scene">
      <circle
        className="focused-domain-orbit focused-domain-orbit-one"
        cx={CENTER_X}
        cy={CENTER_Y}
        r="170"
      />

      <circle
        className="focused-domain-orbit focused-domain-orbit-two"
        cx={CENTER_X}
        cy={CENTER_Y}
        r="270"
      />

      <circle
        className="focused-domain-orbit focused-domain-orbit-three"
        cx={CENTER_X}
        cy={CENTER_Y}
        r="350"
      />

      <ellipse
        className="focused-domain-disc"
        cx={CENTER_X}
        cy={CENTER_Y}
        rx={
          domainRadius *
          1.78
        }
        ry={
          domainRadius *
          0.49
        }
        transform={`rotate(-18 ${CENTER_X} ${CENTER_Y})`}
      />

      <circle
        className="focused-domain-nebula"
        cx={CENTER_X}
        cy={CENTER_Y}
        r={
          domainRadius *
          1.45
        }
      />

      <circle
        className="focused-domain-core"
        cx={CENTER_X}
        cy={CENTER_Y}
        r={
          domainRadius
        }
      />

      <text
        className="focused-domain-count"
        textAnchor="middle"
        x={CENTER_X}
        y={
          CENTER_Y + 6
        }
      >
        {galaxy.count}
      </text>

      <text
        className="focused-domain-label"
        textAnchor="middle"
        x={CENTER_X}
        y={
          CENTER_Y +
          domainRadius +
          36
        }
      >
        {galaxy.label}
      </text>

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

          const selected =
            selectedTopicId ===
            topic.id;

          return (
            <g
              className={
                selected
                  ? "topic-solar-system topic-solar-system-selected"
                  : "topic-solar-system"
              }
              key={
                topic.id
              }
              onClick={() => {
                onSelectTopic(
                  topic,
                );
              }}
              onKeyDown={(event) => {
                if (
                  event.key ===
                    "Enter" ||
                  event.key ===
                    " "
                ) {
                  event.preventDefault();

                  onSelectTopic(
                    topic,
                  );
                }
              }}
              role="button"
              tabIndex={0}
            >
              <line
                className="topic-system-connection"
                x1={CENTER_X}
                x2={
                  position.x
                }
                y1={CENTER_Y}
                y2={
                  position.y
                }
              />

              <circle
                className="topic-system-orbit"
                cx={
                  position.x
                }
                cy={
                  position.y
                }
                r={
                  position.radius *
                  1.74
                }
              />

              <circle
                className="topic-system-halo"
                cx={
                  position.x
                }
                cy={
                  position.y
                }
                r={
                  position.radius *
                  1.38
                }
              />

              <circle
                className="topic-system-core"
                cx={
                  position.x
                }
                cy={
                  position.y
                }
                r={
                  position.radius
                }
              />

              {createDiscoverySatellites(
                topic,
                position,
              ).map(
                (
                  satellite,
                  satelliteIndex,
                ) => (
                  <circle
                    className="topic-discovery-satellite"
                    cx={
                      satellite.x
                    }
                    cy={
                      satellite.y
                    }
                    key={
                      `${topic.id}:${satelliteIndex}`
                    }
                    r={
                      satellite.radius
                    }
                  />
                ),
              )}

              <text
                className="topic-system-count"
                textAnchor="middle"
                x={
                  position.x
                }
                y={
                  position.y + 5
                }
              >
                {topic.count}
              </text>

              <text
                className="topic-system-label"
                textAnchor="middle"
                x={
                  position.x
                }
                y={
                  position.y +
                  position.radius +
                  24
                }
              >
                {shortenLabel(
                  topic.label,
                  24,
                )}
              </text>
            </g>
          );
        },
      )}
    </g>
  );
}

function createDomainGalaxies(
  discoveries: Discovery[],
  graph: KnowledgeGraph | null,
): DomainGalaxy[] {
  if (
    !graph ||
    graph.nodes.length === 0
  ) {
    return createRawDomainGalaxies(
      discoveries,
    );
  }

  const discoveryMap =
    new Map(
      discoveries.map(
        (discovery) => [
          discovery.id,
          discovery,
        ],
      ),
    );

  const nodeMap =
    new Map(
      graph.nodes.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

  const clusterIds =
    buildDomainClusterIds(
      graph,
    );

  const galaxies =
    graph.rootNodeIds
      .map(
        (rootId) =>
          nodeMap.get(rootId),
      )
      .filter(
        (
          node,
        ): node is
          KnowledgeGraph["nodes"][number] =>
          Boolean(
            node &&
            node.kind ===
              "domain",
          ),
      )
      .map((domainNode) => {
        const discoveryIds =
          collectGraphDiscoveryIds(
            domainNode.id,
            nodeMap,
          );

        const domainDiscoveries =
          [...discoveryIds]
            .map(
              (id) =>
                discoveryMap.get(id),
            )
            .filter(
              (
                discovery,
              ): discovery is Discovery =>
                Boolean(discovery),
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

        const topicNodes =
          domainNode.childIds
            .map(
              (childId) =>
                nodeMap.get(
                  childId,
                ),
            )
            .filter(
              (
                node,
              ): node is
                KnowledgeGraph["nodes"][number] =>
                Boolean(
                  node &&
                  node.kind ===
                    "topic",
                ),
            );

        const topics:
          TopicSystem[] =
          topicNodes.length > 0
            ? topicNodes
                .map(
                  (topicNode) => {
                    const topicDiscoveryIds =
                      collectGraphDiscoveryIds(
                        topicNode.id,
                        nodeMap,
                      );

                    const topicDiscoveries =
                      [...topicDiscoveryIds]
                        .map(
                          (id) =>
                            discoveryMap.get(
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
                        );

                    return {
                      id:
                        topicNode.id,

                      label:
                        topicNode.title,

                      count:
                        topicDiscoveries.length,

                      discoveries:
                        topicDiscoveries,
                    };
                  },
                )
                .filter(
                  (topic) =>
                    topic.count > 0,
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
                  12,
                )
            : createRawTopicSystems(
                domainDiscoveries,
                domainNode.title,
              );

        return {
          id:
            domainNode.id,

          key:
            domainNode.title,

          label:
            domainNode.title,

          count:
            domainDiscoveries.length,

          discoveries:
            domainDiscoveries,

          topics,

          clusterId:
            clusterIds.get(
              domainNode.id,
            ) ??
            domainNode.id,
        };
      })
      .filter(
        (galaxy) =>
          galaxy.count > 0,
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.count -
          left.count,
      );

  /*
   * Wenn der Graph noch nicht alle
   * Discoveries repräsentiert, nichts
   * verschwinden lassen.
   */
  const representedIds =
    new Set(
      galaxies.flatMap(
        (galaxy) =>
          galaxy.discoveries.map(
            (discovery) =>
              discovery.id,
          ),
      ),
    );

  const missingDiscoveries =
    discoveries.filter(
      (discovery) =>
        !representedIds.has(
          discovery.id,
        ),
    );

  if (
    missingDiscoveries.length >
    0
  ) {
    return [
      ...galaxies,
      ...createRawDomainGalaxies(
        missingDiscoveries,
      ),
    ];
  }

  return galaxies;
}

function createRawDomainGalaxies(
  discoveries: Discovery[],
): DomainGalaxy[] {
  const grouped =
    new Map<
      string,
      Discovery[]
    >();

  for (
    const discovery
    of discoveries
  ) {
    const domain =
      discovery.classification
        ?.secondaryCategory
        ?.trim() ||
      "Noch nicht eingeordnet";

    const key =
      normalizeGalaxyKey(
        domain,
      );

    const current =
      grouped.get(key) ??
      [];

    current.push(
      discovery,
    );

    grouped.set(
      key,
      current,
    );
  }

  return [...grouped.entries()]
    .sort(
      (
        left,
        right,
      ) =>
        right[1].length -
        left[1].length,
    )
    .map(
      (
        [key, items],
      ) => {
        const label =
          items[0]
            ?.classification
            ?.secondaryCategory
            ?.trim() ||
          "Noch nicht eingeordnet";

        return {
          id:
            `domain:${key}`,

          key,

          label,

          count:
            items.length,

          discoveries:
            [...items].sort(
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
            ),

          topics:
            createRawTopicSystems(
              items,
              key,
            ),

          /*
           * Ohne Graph bildet jede
           * Galaxie zunächst ihren
           * eigenen Cluster.
           */
          clusterId:
            `raw:${key}`,
        };
      },
    );
}

function createRawTopicSystems(
  discoveries: Discovery[],
  domainKey: string,
): TopicSystem[] {
  const topicMap =
    new Map<
      string,
      {
        label: string;
        discoveries:
          Discovery[];
      }
    >();

  for (
    const discovery
    of discoveries
  ) {
    const topic =
      discovery.classification
        ?.topic
        ?.trim() ||
      discovery.topics?.[0]
        ?.trim() ||
      "Weitere Planeten";

    const key =
      normalizeGalaxyKey(
        topic,
      );

    const current =
      topicMap.get(key) ?? {
        label: topic,
        discoveries: [],
      };

    current.discoveries.push(
      discovery,
    );

    topicMap.set(
      key,
      current,
    );
  }

  return [...topicMap.entries()]
    .sort(
      (
        left,
        right,
      ) =>
        right[1].discoveries
          .length -
        left[1].discoveries
          .length,
    )
    .slice(
      0,
      12,
    )
    .map(
      (
        [key, value],
      ) => ({
        id:
          `${domainKey}:${key}`,

        label:
          value.label,

        count:
          value.discoveries
            .length,

        discoveries:
          [...value.discoveries].sort(
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
          ),
      }),
    );
}

function buildDomainClusterIds(
  graph: KnowledgeGraph,
): Map<string, string> {
  const nodeMap =
    new Map(
      graph.nodes.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

  const rootIds =
    new Set(
      graph.rootNodeIds,
    );

  const parent =
    new Map<string, string>(
      graph.rootNodeIds.map(
        (id) => [
          id,
          id,
        ],
      ),
    );

  function find(
    id: string,
  ): string {
    const current =
      parent.get(id) ??
      id;

    if (current === id) {
      return id;
    }

    const root =
      find(current);

    parent.set(
      id,
      root,
    );

    return root;
  }

  function union(
    first: string,
    second: string,
  ): void {
    const firstRoot =
      find(first);

    const secondRoot =
      find(second);

    if (
      firstRoot === secondRoot
    ) {
      return;
    }

    parent.set(
      secondRoot,
      firstRoot,
    );
  }

  const rootCache =
    new Map<
      string,
      string | null
    >();

  function getRootId(
    nodeId: string,
  ): string | null {
    if (
      rootCache.has(nodeId)
    ) {
      return (
        rootCache.get(
          nodeId,
        ) ??
        null
      );
    }

    let current =
      nodeMap.get(
        nodeId,
      );

    const visited =
      new Set<string>();

    while (current) {
      if (
        rootIds.has(
          current.id,
        )
      ) {
        rootCache.set(
          nodeId,
          current.id,
        );

        return current.id;
      }

      if (
        !current.parentId ||
        visited.has(
          current.id,
        )
      ) {
        break;
      }

      visited.add(
        current.id,
      );

      current =
        nodeMap.get(
          current.parentId,
        );
    }

    rootCache.set(
      nodeId,
      null,
    );

    return null;
  }

  /*
   * KI-Relationen werden hier zu
   * visuellen Clustern verdichtet.
   *
   * Hoher Schwellwert verhindert,
   * dass das gesamte Universum zu
   * einem einzigen Cluster wird.
   */
  for (
    const relation
    of graph.relations
  ) {
    if (
      relation.strength <
      0.72
    ) {
      continue;
    }

    if (
      ![
        "related",
        "supports",
        "applies-to",
      ].includes(
        relation.kind,
      )
    ) {
      continue;
    }

    const sourceRoot =
      getRootId(
        relation.sourceId,
      );

    const targetRoot =
      getRootId(
        relation.targetId,
      );

    if (
      !sourceRoot ||
      !targetRoot ||
      sourceRoot ===
        targetRoot
    ) {
      continue;
    }

    union(
      sourceRoot,
      targetRoot,
    );
  }

  return new Map(
    graph.rootNodeIds.map(
      (rootId) => [
        rootId,
        find(rootId),
      ],
    ),
  );
}

function collectGraphDiscoveryIds(
  nodeId: string,
  nodeMap:
    Map<
      string,
      KnowledgeGraph["nodes"][number]
    >,
  visited =
    new Set<string>(),
): Set<string> {
  if (
    visited.has(nodeId)
  ) {
    return new Set();
  }

  visited.add(nodeId);

  const node =
    nodeMap.get(nodeId);

  if (!node) {
    return new Set();
  }

  const result =
    new Set(
      node.discoveryIds,
    );

  for (
    const childId
    of node.childIds
  ) {
    for (
      const discoveryId
      of collectGraphDiscoveryIds(
        childId,
        nodeMap,
        visited,
      )
    ) {
      result.add(
        discoveryId,
      );
    }
  }

  return result;
}

function normalizeGalaxyKey(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function createOverviewPositions(
  galaxies:
    DomainGalaxy[],
): OverviewPosition[] {
  if (
    galaxies.length === 0
  ) {
    return [];
  }

  const clusterMap =
    new Map<
      string,
      Array<{
        galaxy:
          DomainGalaxy;
        index: number;
      }>
    >();

  galaxies.forEach(
    (
      galaxy,
      index,
    ) => {
      const group =
        clusterMap.get(
          galaxy.clusterId,
        ) ??
        [];

      group.push({
        galaxy,
        index,
      });

      clusterMap.set(
        galaxy.clusterId,
        group,
      );
    },
  );

  const clusters =
    [...clusterMap.values()]
      .sort(
        (
          left,
          right,
        ) =>
          right.reduce(
            (
              total,
              item,
            ) =>
              total +
              item.galaxy.count,
            0,
          ) -
          left.reduce(
            (
              total,
              item,
            ) =>
              total +
              item.galaxy.count,
            0,
          ),
      );

  const positions:
    OverviewPosition[] =
    new Array(
      galaxies.length,
    );

  const clusterCount =
    clusters.length;

  clusters.forEach(
    (
      members,
      clusterIndex,
    ) => {
      const clusterAngle =
        (
          Math.PI *
          2 *
          clusterIndex
        ) /
          Math.max(
            clusterCount,
            1,
          ) -
        Math.PI / 2;

      /*
       * Die Cluster selbst liegen
       * großzügig verteilt um die
       * Mitte des Universums.
       */
      const clusterRing =
        clusterCount <= 4
          ? 235
          : clusterCount <= 7
            ? 275
            : 305;

      const clusterCenterX =
        clusterCount === 1
          ? CENTER_X
          : CENTER_X +
            Math.cos(
              clusterAngle,
            ) *
              clusterRing;

      const clusterCenterY =
        clusterCount === 1
          ? CENTER_Y
          : CENTER_Y +
            Math.sin(
              clusterAngle,
            ) *
              clusterRing *
              0.68;

      members.forEach(
        (
          member,
          memberIndex,
        ) => {
          const memberCount =
            members.length;

          if (
            memberCount === 1
          ) {
            positions[
              member.index
            ] = {
              x:
                clusterCenterX,

              y:
                clusterCenterY,

              radius:
                calculateDomainRadius(
                  member.galaxy
                    .count,
                ),
            };

            return;
          }

          /*
           * Petal-/Traubenform ähnlich
           * der vom Nutzer skizzierten
           * Clusteridee.
           */
          const localAngle =
            (
              Math.PI *
              2 *
              memberIndex
            ) /
              memberCount -
            Math.PI / 2;

          const localRing =
            memberCount <= 3
              ? 70
              : memberCount <= 6
                ? 88
                : 105;

          positions[
            member.index
          ] = {
            x:
              clusterCenterX +
              Math.cos(
                localAngle,
              ) *
                localRing,

            y:
              clusterCenterY +
              Math.sin(
                localAngle,
              ) *
                localRing *
                0.78,

            /*
             * Im Cluster etwas kompakter,
             * damit Beschriftungen weniger
             * kollidieren.
             */
            radius:
              Math.min(
                48,
                calculateDomainRadius(
                  member.galaxy
                    .count,
                ),
              ),
          };
        },
      );
    },
  );

  return positions;
}

function createFocusedTopicPositions(
  topics:
    TopicSystem[],
): Array<{
  x: number;
  y: number;
  radius: number;
}> {
  return topics.map(
    (
      topic,
      index,
    ) => {
      const count =
        Math.max(
          topics.length,
          1,
        );

      const angle =
        (
          Math.PI *
          2 *
          index
        ) /
          count -
        Math.PI / 2;

      const ring =
        index % 3 === 0
          ? 205
          : index % 3 === 1
            ? 292
            : 345;

      return {
        x:
          CENTER_X +
          Math.cos(angle) *
            ring,

        y:
          CENTER_Y +
          Math.sin(angle) *
            ring *
            0.78,

        radius:
          Math.min(
            35,
            18 +
              Math.sqrt(
                topic.count,
              ) *
                5,
          ),
      };
    },
  );
}

function createDiscoverySatellites(
  topic:
    TopicSystem,

  position: {
    x: number;
    y: number;
    radius: number;
  },
): Array<{
  x: number;
  y: number;
  radius: number;
}> {
  const visibleCount =
    Math.min(
      topic.count,
      8,
    );

  return Array.from({
    length:
      visibleCount,
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
            visibleCount,
            1,
          );

      const orbit =
        position.radius *
        1.72;

      return {
        x:
          position.x +
          Math.cos(angle) *
            orbit,

        y:
          position.y +
          Math.sin(angle) *
            orbit,

        radius:
          index % 3 === 0
            ? 3.3
            : 2.4,
      };
    },
  );
}

function calculateDomainRadius(
  count: number,
): number {
  return Math.min(
    72,
    28 +
      Math.sqrt(
        count,
      ) *
        9,
  );
}

function shortenLabel(
  value: string,
  maximumLength: number,
): string {
  return value.length >
    maximumLength
    ? `${value.slice(
        0,
        maximumLength - 1,
      )}…`
    : value;
}
