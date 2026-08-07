"use client";

import type {
  Discovery,
} from "@savewise/shared";

import {
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
        ),
      [workspaceDiscoveries],
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
                : "Jede Galaxie entspricht einem deiner Wissensbereiche. Je mehr Discoveries vorhanden sind, desto größer erscheint sie."}
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
  discoveries:
    Discovery[],
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

    const current =
      grouped.get(
        domain,
      ) ??
      [];

    current.push(
      discovery,
    );

    grouped.set(
      domain,
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
        [domain, items],
      ) => {
        const topicMap =
          new Map<
            string,
            Discovery[]
          >();

        for (
          const discovery
          of items
        ) {
          const topic =
            discovery.classification
              ?.topic?.trim() ||
            discovery.topics?.[0]
              ?.trim() ||
            "Weitere Themen";

          const current =
            topicMap.get(
              topic,
            ) ??
            [];

          current.push(
            discovery,
          );

          topicMap.set(
            topic,
            current,
          );
        }

        const topics =
          [...topicMap.entries()]
            .sort(
              (
                left,
                right,
              ) =>
                right[1].length -
                left[1].length,
            )
            .slice(0, 12)
            .map(
              (
                [topic, topicItems],
              ) => ({
                id:
                  `${domain}:${topic}`,

                label:
                  topic,

                count:
                  topicItems.length,

                discoveries:
                  [...topicItems].sort(
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

        return {
          id:
            `domain:${domain}`,

          key:
            domain,

          label:
            domain,

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

          topics,
        };
      },
    );
}

function createOverviewPositions(
  galaxies:
    DomainGalaxy[],
): OverviewPosition[] {
  const count =
    galaxies.length;

  return galaxies.map(
    (
      galaxy,
      index,
    ) => {
      if (
        count === 1
      ) {
        return {
          x:
            CENTER_X,

          y:
            CENTER_Y,

          radius:
            calculateDomainRadius(
              galaxy.count,
            ),
        };
      }

      const angle =
        (
          Math.PI *
          2 *
          index
        ) /
          count -
        Math.PI / 2;

      const ring =
        count <= 5
          ? 260
          : index % 2 === 0
            ? 235
            : 330;

      return {
        x:
          CENTER_X +
          Math.cos(angle) *
            ring,

        y:
          CENTER_Y +
          Math.sin(angle) *
            ring *
            0.72,

        radius:
          calculateDomainRadius(
            galaxy.count,
          ),
      };
    },
  );
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
