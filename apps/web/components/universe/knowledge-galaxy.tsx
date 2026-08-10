"use client";

import type {
  Discovery,
  KnowledgeGraph,
} from "@savewise/shared";

import {
  useEffect,
  useMemo,
  useRef,
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

type StarSystem = {
  id: string;
  label: string;
  count: number;
  discoveries: Discovery[];
};

type TopicSystem = {
  id: string;
  label: string;
  count: number;
  discoveries: Discovery[];
  stars: StarSystem[];
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
  1800;

const HEIGHT =
  1150;

const CENTER_X =
  WIDTH / 2;

const CENTER_Y =
  HEIGHT / 2;

const INITIAL_VIEW_WIDTH =
  1200;

const INITIAL_VIEW_HEIGHT =
  720;

const MIN_VIEW_WIDTH =
  430;

const MAX_VIEW_WIDTH =
  WIDTH;

type UniverseCamera = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function createInitialCamera():
UniverseCamera {
  return {
    x:
      CENTER_X -
      INITIAL_VIEW_WIDTH / 2,

    y:
      CENTER_Y -
      INITIAL_VIEW_HEIGHT / 2,

    width:
      INITIAL_VIEW_WIDTH,

    height:
      INITIAL_VIEW_HEIGHT,
  };
}

function clampCamera(
  camera:
    UniverseCamera,
): UniverseCamera {
  const width =
    Math.min(
      WIDTH,
      Math.max(
        MIN_VIEW_WIDTH,
        camera.width,
      ),
    );

  const height =
    width *
    (
      INITIAL_VIEW_HEIGHT /
      INITIAL_VIEW_WIDTH
    );

  const maxX =
    Math.max(
      0,
      WIDTH -
      width,
    );

  const maxY =
    Math.max(
      0,
      HEIGHT -
      height,
    );

  return {
    x:
      Math.min(
        maxX,
        Math.max(
          0,
          camera.x,
        ),
      ),

    y:
      Math.min(
        maxY,
        Math.max(
          0,
          camera.y,
        ),
      ),

    width,
    height,
  };
}

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
    camera,
    setCamera,
  ] =
    useState<UniverseCamera>(
      createInitialCamera,
    );

  const dragState =
    useRef<{
      pointerId: number;
      clientX: number;
      clientY: number;
      camera:
        UniverseCamera;
      moved: boolean;
    } | null>(
      null,
    );

  const svgRef =
    useRef<SVGSVGElement | null>(
      null,
    );

  const zoomLevel =
    INITIAL_VIEW_WIDTH /
    camera.width;

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

  useEffect(() => {
    setCamera(
      createInitialCamera(),
    );
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

  const [
    selectedStarId,
    setSelectedStarId,
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

  const selectedStar =
    selectedTopic && selectedStarId
      ? selectedTopic.stars.find(
          (star) =>
            star.id === selectedStarId,
        ) ?? null
      : null;

  const inspectorDiscoveries =
    selectedStar
      ? selectedStar.discoveries
      : selectedTopic
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

  function handleUniverseWheel(
    event:
      React.WheelEvent<
        SVGSVGElement
      >,
  ): void {
    event.preventDefault();

    const svg =
      svgRef.current;

    if (!svg) {
      return;
    }

    const rect =
      svg.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return;
    }

    const pointerX =
      (
        event.clientX -
        rect.left
      ) /
      rect.width;

    const pointerY =
      (
        event.clientY -
        rect.top
      ) /
      rect.height;

    const zoomFactor =
      Math.exp(
        event.deltaY *
        0.00135,
      );

    setCamera(
      (current) => {
        const nextWidth =
          Math.min(
            MAX_VIEW_WIDTH,
            Math.max(
              MIN_VIEW_WIDTH,
              current.width *
              zoomFactor,
            ),
          );

        const nextHeight =
          nextWidth *
          (
            INITIAL_VIEW_HEIGHT /
            INITIAL_VIEW_WIDTH
          );

        const worldPointerX =
          current.x +
          pointerX *
          current.width;

        const worldPointerY =
          current.y +
          pointerY *
          current.height;

        return clampCamera({
          x:
            worldPointerX -
            pointerX *
            nextWidth,

          y:
            worldPointerY -
            pointerY *
            nextHeight,

          width:
            nextWidth,

          height:
            nextHeight,
        });
      },
    );
  }

  function handleUniversePointerDown(
    event:
      React.PointerEvent<
        SVGSVGElement
      >,
  ): void {
    if (
      event.pointerType ===
        "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );

    dragState.current = {
      pointerId:
        event.pointerId,

      clientX:
        event.clientX,

      clientY:
        event.clientY,

      camera: {
        ...camera,
      },

      moved:
        false,
    };
  }

  function handleUniversePointerMove(
    event:
      React.PointerEvent<
        SVGSVGElement
      >,
  ): void {
    const drag =
      dragState.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const svg =
      svgRef.current;

    if (!svg) {
      return;
    }

    const rect =
      svg.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return;
    }

    const deltaClientX =
      event.clientX -
      drag.clientX;

    const deltaClientY =
      event.clientY -
      drag.clientY;

    if (
      Math.abs(
        deltaClientX,
      ) > 3 ||
      Math.abs(
        deltaClientY,
      ) > 3
    ) {
      drag.moved =
        true;
    }

    const deltaWorldX =
      deltaClientX /
      rect.width *
      drag.camera.width;

    const deltaWorldY =
      deltaClientY /
      rect.height *
      drag.camera.height;

    setCamera(
      clampCamera({
        ...drag.camera,

        x:
          drag.camera.x -
          deltaWorldX,

        y:
          drag.camera.y -
          deltaWorldY,
      }),
    );
  }

  function finishUniversePointer(
    event:
      React.PointerEvent<
        SVGSVGElement
      >,
  ): void {
    const drag =
      dragState.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    dragState.current =
      null;

    try {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId,
        );
    } catch {
      // Pointer capture may already
      // have been released.
    }
  }

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

    setSelectedStarId(
      null,
    );
  }

  function selectTopic(
    topic:
      TopicSystem,
  ): void {
    setSelectedStarId(
      null,
    );

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
          Galaxien, Planeten und
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
                : "SaveWise verteilt Galaxien frei im Raum, gruppiert verwandte Wissensbereiche intelligent und zeigt inhaltsstärkere Galaxien größer an."}
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
            onPointerCancel={
              finishUniversePointer
            }
            onPointerDown={
              handleUniversePointerDown
            }
            onPointerMove={
              handleUniversePointerMove
            }
            onPointerUp={
              finishUniversePointer
            }
            onWheel={
              handleUniverseWheel
            }
            preserveAspectRatio="xMidYMid meet"
            ref={
              svgRef
            }
            role="img"
            style={{
              cursor:
                dragState.current
                  ? "grabbing"
                  : "grab",

              touchAction:
                "none",
            }}
            viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`}
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
                        onClick={(event) => {
                          event.stopPropagation();

                          selectDomain(
                            galaxy,
                          );
                        }}
                        onPointerDown={(event) => {
                          event.stopPropagation();
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

                        {
                          (
                            zoomLevel >=
                              0.72 ||
                            galaxy.count >=
                              3
                          ) ? (
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
                          ) : null
                        }
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
                selectedStarId={
                  selectedStarId
                }
                onSelectStar={(
                  star,
                ) => {
                  setSelectedStarId(
                    star.id,
                  );
                }}
              />
            )}
          </svg>

          <div className="galaxy-control-hint">
            {selectedGalaxy
              ? "Ziehen zum Verschieben · Scrollen/Trackpad zum Zoomen · Planet anklicken zum Erkunden"
              : "Ziehen zum Verschieben · Scrollen/Trackpad zum Zoomen · Galaxie anklicken zum Erkunden"}
          </div>
        </div>
      </div>

      <aside className="galaxy-inspector">
        {selectedGalaxy ? (
          <>
            <div className="card-eyebrow">
              {selectedStar
                ? "STERN"
                : selectedTopic
                  ? "SONNENSYSTEM"
                  : "GALAXIE"}
            </div>

            <h3>
              {selectedStar
                ? selectedStar.label
                : selectedTopic
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
                  setSelectedStarId(
                    null,
                  );

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
              Wähle links eine Galaxie.
              Sie wird anschließend geöffnet
              und in ihre Planeten
              aufgeteilt.
            </p>

            <div className="galaxy-legend">
              <div>
                <span className="legend-node legend-node-core" />

                Galaxie
              </div>

              <div>
                <span className="legend-node legend-node-domain" />

                Planet
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
  selectedStarId,
  onSelectTopic,
  onSelectStar,
}: {
  galaxy:
    DomainGalaxy;

  selectedTopicId:
    string | null;

  selectedStarId:
    string | null;

  onSelectTopic:
    (topic: TopicSystem) => void;

  onSelectStar:
    (star: StarSystem) => void;
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
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onPointerUp={(event) => {
                event.preventDefault();
                event.stopPropagation();

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

              {selected
                ? createStarSatellites(
                    topic,
                    position,
                  ).map(
                    (
                      satellite,
                      starIndex,
                    ) => {
                      const star =
                        topic.stars[
                          starIndex
                        ];

                      if (!star) {
                        return null;
                      }

                      const starSelected =
                        selectedStarId ===
                        star.id;

                      return (
                        <g
                          key={
                            star.id
                          }
                          onClick={(event) => {
                            event.stopPropagation();

                            onSelectStar(
                              star,
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
                              event.stopPropagation();

                              onSelectStar(
                                star,
                              );
                            }
                          }}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                          }}
                          role="button"
                          style={{
                            cursor:
                              "pointer",
                          }}
                          tabIndex={0}
                        >
                          <circle
                            cx={
                              satellite.x
                            }
                            cy={
                              satellite.y
                            }
                            fill="transparent"
                            r="18"
                          />

                          <circle
                            className={
                              starSelected
                                ? "topic-discovery-satellite topic-discovery-satellite-selected"
                                : "topic-discovery-satellite"
                            }
                            cx={
                              satellite.x
                            }
                            cy={
                              satellite.y
                            }
                            r={
                              starSelected
                                ? satellite.radius + 1.8
                                : satellite.radius
                            }
                          />

                          {star.count > 1 ? (
                            <text
                              fontSize="9"
                              fontWeight="700"
                              pointerEvents="none"
                              textAnchor="middle"
                              x={
                                satellite.x
                              }
                              y={
                                satellite.y + 3
                              }
                            >
                              {star.count}
                            </text>
                          ) : null}

                          <text
                            fontSize="11"
                            pointerEvents="none"
                            textAnchor="middle"
                            x={
                              satellite.x
                            }
                            y={
                              satellite.y + 24
                            }
                          >
                            {shortenLabel(
                              star.label,
                              18,
                            )}
                          </text>
                        </g>
                      );
                    },
                  )
                : null}

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
  /*
   * SOURCE OF TRUTH:
   *
   * Galaxie = classification.secondaryCategory
   * Planet  = classification.topic
   * Sterne  = classification.subtopics
   *
   * Der KI-Graph darf diese Hierarchie nicht ersetzen.
   */
  const galaxies =
    createRawDomainGalaxies(
      discoveries,
    );

  if (!graph) {
    return galaxies;
  }

  /*
   * Der Graph wird ausschließlich für
   * die visuelle Cluster-Zuordnung benutzt.
   */
  const graphClusterIds =
    buildDomainClusterIds(
      graph,
    );

  const graphDomains =
    graph.nodes.filter(
      (node) =>
        node.kind === "domain",
    );

  const graphDomainByName =
    new Map<
      string,
      KnowledgeGraph["nodes"][number]
    >();

  for (
    const node
    of graphDomains
  ) {
    graphDomainByName.set(
      normalizeGalaxyKey(
        node.title,
      ),
      node,
    );

    for (
      const alias
      of node.aliases
    ) {
      graphDomainByName.set(
        normalizeGalaxyKey(
          alias,
        ),
        node,
      );
    }
  }

  return galaxies.map(
    (galaxy) => {
      const graphNode =
        graphDomainByName.get(
          normalizeGalaxyKey(
            galaxy.label,
          ),
        );

      if (!graphNode) {
        return galaxy;
      }

      return {
        ...galaxy,

        clusterId:
          graphClusterIds.get(
            graphNode.id,
          ) ??
          graphNode.id,
      };
    },
  );
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
        label:
          topic,

        discoveries:
          [],
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
        right[1]
          .discoveries
          .length -
        left[1]
          .discoveries
          .length,
    )
    .slice(
      0,
      12,
    )
    .map(
      (
        [key, value],
      ) => {
        const sortedDiscoveries =
          [...value.discoveries]
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

        return {
          id:
            `${domainKey}:${key}`,

          label:
            value.label,

          count:
            sortedDiscoveries
              .length,

          discoveries:
            sortedDiscoveries,

          /*
           * Echte Sternebene:
           *
           * Galaxie
           *   → Planet
           *      → Stern/Subtopic
           *         → Discoveries
           */
          stars:
            createRawStarSystems(
              sortedDiscoveries,
              `${domainKey}:${key}`,
            ),
        };
      },
    );
}


function createRawStarSystems(
  discoveries: Discovery[],
  topicKey: string,
): StarSystem[] {
  const starMap =
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
    const rawStars =
      discovery.classification
        ?.subtopics
        ?.map(
          (value) =>
            value.trim(),
        )
        .filter(
          (value) =>
            value.length > 0,
        ) ??
      [];

    /*
     * Discovery ohne Subtopic nicht verlieren.
     */
    const stars =
      rawStars.length > 0
        ? rawStars
        : [
            "Weitere Inhalte",
          ];

    for (
      const star
      of stars
    ) {
      const key =
        normalizeGalaxyKey(
          star,
        );

      const current =
        starMap.get(key) ?? {
          label:
            star,

          discoveries:
            [],
        };

      /*
       * Dieselbe Discovery innerhalb
       * desselben Sterns nur einmal.
       */
      if (
        !current
          .discoveries
          .some(
            (item) =>
              item.id ===
              discovery.id,
          )
      ) {
        current
          .discoveries
          .push(
            discovery,
          );
      }

      starMap.set(
        key,
        current,
      );
    }
  }

  return [...starMap.entries()]
    .sort(
      (
        left,
        right,
      ) =>
        right[1]
          .discoveries
          .length -
        left[1]
          .discoveries
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
          `${topicKey}:star:${key}`,

        label:
          value.label,

        count:
          value.discoveries
            .length,

        discoveries:
          [...value.discoveries]
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
        ) ?? [];

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
    [...clusterMap.entries()]
      .map(
        ([clusterId, members]) => ({
          clusterId,
          members,
          totalCount:
            members.reduce(
              (
                total,
                member,
              ) =>
                total +
                member.galaxy.count,
              0,
            ),
        }),
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.totalCount -
          left.totalCount,
      );

  const positions:
    OverviewPosition[] =
    new Array(
      galaxies.length,
    );

  const clusterCenters =
    createClusterScatterCenters(
      clusters.map(
        (cluster) => ({
          id:
            cluster.clusterId,
          size:
            cluster.members.length,
          weight:
            cluster.totalCount,
        }),
      ),
    );

  clusters.forEach(
    (
      cluster,
      clusterIndex,
    ) => {
      const center =
        clusterCenters[
          clusterIndex
        ];

      const members =
        cluster.members;

      const clusterSeed =
        seededNumber(
          cluster.clusterId,
        );

      members.forEach(
        (
          member,
          memberIndex,
        ) => {
          const galaxy =
            member.galaxy;

          const radius =
            calculateGalaxyDisplayRadius(
              galaxy.count,
            );

          if (
            members.length === 1
          ) {
            positions[
              member.index
            ] = {
              x:
                clampPosition(
                  center.x,
                  radius,
                  96,
                ),
              y:
                clampPosition(
                  center.y,
                  radius,
                  92,
                ),
              radius,
            };

            return;
          }

          /*
           * Innerhalb eines Clusters:
           * lockere, unregelmäßige Verteilung
           * statt perfekter Kreisform.
           */
          const localSeed =
            seededNumber(
              `${cluster.clusterId}:${galaxy.id}:${memberIndex}`,
            );

          const angle =
            localSeed *
            Math.PI *
            2;

          const spiralFactor =
            (memberIndex + 1) /
            members.length;

          const spreadBase =
            members.length <= 3
              ? 70
              : members.length <= 6
                ? 95
                : members.length <= 10
                  ? 120
                  : 145;

          const spread =
            spreadBase *
            (0.45 +
              spiralFactor *
                0.9);

          const offsetX =
            Math.cos(angle) *
              spread +
            Math.sin(
              angle *
                1.7 +
                clusterSeed *
                  2,
            ) *
              22;

          const offsetY =
            Math.sin(angle) *
              spread *
              0.82 +
            Math.cos(
              angle *
                1.3 +
                clusterSeed *
                  3,
            ) *
              18;

          positions[
            member.index
          ] = {
            x:
              clampPosition(
                center.x +
                  offsetX,
                radius,
                96,
              ),
            y:
              clampPosition(
                center.y +
                  offsetY,
                radius,
                92,
              ),
            radius,
          };
        },
      );
    },
  );

  return relaxOverviewPositions(
    positions,
    18,
  );
}

function createClusterScatterCenters(
  clusters: Array<{
    id: string;
    size: number;
    weight: number;
  }>,
): Array<{
  x: number;
  y: number;
}> {
  if (
    clusters.length === 0
  ) {
    return [];
  }

  const usableWidth =
    WIDTH - 220;

  const usableHeight =
    HEIGHT - 190;

  const cols =
    Math.max(
      2,
      Math.ceil(
        Math.sqrt(
          clusters.length,
        ),
      ),
    );

  const rows =
    Math.max(
      2,
      Math.ceil(
        clusters.length / cols,
      ),
    );

  const cellWidth =
    usableWidth / cols;

  const cellHeight =
    usableHeight / rows;

  const cells:
    Array<{
      col: number;
      row: number;
      seed: number;
    }> = [];

  for (
    let row = 0;
    row < rows;
    row += 1
  ) {
    for (
      let col = 0;
      col < cols;
      col += 1
    ) {
      cells.push({
        col,
        row,
        seed:
          seededNumber(
            `cell:${col}:${row}`,
          ),
      });
    }
  }

  cells.sort(
    (left, right) =>
      left.seed - right.seed,
  );

  return clusters.map(
    (
      cluster,
      index,
    ) => {
      const cell =
        cells[
          index % cells.length
        ];

      const seed =
        seededNumber(
          `cluster:${cluster.id}`,
        );

      const jitterX =
        (seed - 0.5) *
        cellWidth *
        0.58;

      const jitterY =
        (
          seededNumber(
            `${cluster.id}:y`,
          ) - 0.5
        ) *
        cellHeight *
        0.58;

      const x =
        110 +
        cell.col *
          cellWidth +
        cellWidth / 2 +
        jitterX;

      const y =
        88 +
        cell.row *
          cellHeight +
        cellHeight / 2 +
        jitterY;

      return {
        x,
        y,
      };
    },
  );
}

function calculateGalaxyDisplayRadius(
  count: number,
): number {
  const base =
    calculateDomainRadius(
      count,
    );

  /*
   * Mehr Inhalte = sichtbar größere Galaxie.
   * Trotzdem innerhalb sinnvoller Grenzen.
   */
  return Math.max(
    28,
    Math.min(
      74,
      base + Math.log2(count + 1) * 6,
    ),
  );
}

function relaxOverviewPositions(
  positions:
    OverviewPosition[],
  padding: number,
): OverviewPosition[] {
  const next =
    positions.map(
      (position) => ({
        ...position,
      }),
    );

  for (
    let iteration = 0;
    iteration < 140;
    iteration += 1
  ) {
    for (
      let i = 0;
      i < next.length;
      i += 1
    ) {
      for (
        let j = i + 1;
        j < next.length;
        j += 1
      ) {
        const left =
          next[i];
        const right =
          next[j];

        const dx =
          right.x - left.x;
        const dy =
          right.y - left.y;

        const distance =
          Math.max(
            1,
            Math.hypot(
              dx,
              dy,
            ),
          );

        const minDistance =
          left.radius +
          right.radius +
          padding;

        if (
          distance >=
          minDistance
        ) {
          continue;
        }

        const push =
          (minDistance -
            distance) /
          2;

        const ux =
          dx / distance;
        const uy =
          dy / distance;

        left.x -=
          ux * push;
        left.y -=
          uy * push;

        right.x +=
          ux * push;
        right.y +=
          uy * push;

        left.x =
          clampPosition(
            left.x,
            left.radius,
            96,
          );
        left.y =
          clampPosition(
            left.y,
            left.radius,
            92,
          );

        right.x =
          clampPosition(
            right.x,
            right.radius,
            96,
          );
        right.y =
          clampPosition(
            right.y,
            right.radius,
            92,
          );
      }
    }
  }

  return next;
}

function clampPosition(
  value: number,
  radius: number,
  padding: number,
): number {
  return Math.max(
    radius + padding,
    Math.min(
      WIDTH -
        radius -
        padding,
      value,
    ),
  );
}

function seededNumber(
  input: string,
): number {
  let hash = 2166136261;

  for (
    let index = 0;
    index < input.length;
    index += 1
  ) {
    hash ^=
      input.charCodeAt(
        index,
      );

    hash =
      Math.imul(
        hash,
        16777619,
      );
  }

  return (
    (hash >>> 0) %
    10000
  ) / 10000;
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

function createStarSatellites(
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
      topic.stars.length,
      12,
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
