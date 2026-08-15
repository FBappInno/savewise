"use client";

import type {
  Discovery,
  KnowledgeGraph,
  KnowledgeLibrary,
} from "@savewise/shared";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

import {
  getKnowledgeLibrary,
} from "@/services/knowledge-client";

import {
  rebuildKnowledgeLibrary,
} from "@/services/knowledge-client";

import {
  KnowledgeUniverseWebGl,
} from "@/components/universe/knowledge-universe-webgl";

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
  WIDTH;

const INITIAL_VIEW_HEIGHT =
  1080;

const MIN_VIEW_WIDTH =
  430;

const ZOOM_REFERENCE_WIDTH = 1200;

const MAX_VIEW_WIDTH =
  WIDTH;

const SPHERE_END_ZOOM = 0.78;
const LANDSCAPE_START_ZOOM = 1;
const LANDSCAPE_FULL_ZOOM = 1.08;

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

  const previousUniverseLevel =
    useRef(0);

  const svgRef =
    useRef<SVGSVGElement | null>(
      null,
    );

  const zoomLevel =
    ZOOM_REFERENCE_WIDTH /
    camera.width;

  const [
    knowledgeLibrary,
    setKnowledgeLibrary,
  ] =
    useState<KnowledgeLibrary | null>(
      null,
    );

  const [
    isLoading,
    setLoading,
  ] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function loadGraph():
    Promise<void> {
      setLoading(true);
      setKnowledgeLibrary(null);

      try {
        const library =
          await getKnowledgeLibrary(
            activeWorkspaceId,
          );

        if (active) {
          setKnowledgeLibrary(
            library,
          );
        }
      } catch {
        if (active) {
          setKnowledgeLibrary(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadGraph();

    return () => {
      active = false;
    };
  }, [activeWorkspaceId]);

  useEffect(() => {
    const reset = window.setTimeout(() => {
      setCamera(
        createInitialCamera(),
      );
    }, 0);

    return () => window.clearTimeout(reset);
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
          knowledgeLibrary
            ?.discoveries ??
            [],
          knowledgeLibrary
            ?.graph ??
            null,
        ),
      [
        knowledgeLibrary,
      ],
    );

  const libraryDiscoveries =
    knowledgeLibrary
      ?.discoveries ??
    [];

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

  const universeLevel = selectedGalaxy
    ? 3
    : zoomLevel < SPHERE_END_ZOOM
      ? 0
      : zoomLevel < LANDSCAPE_START_ZOOM
        ? 1
        : 2;

  const openingProgress = clamp01(
    (zoomLevel - SPHERE_END_ZOOM) /
    (LANDSCAPE_START_ZOOM - SPHERE_END_ZOOM),
  );

  const landscapeProgress = clamp01(
    (zoomLevel - LANDSCAPE_START_ZOOM) /
    (LANDSCAPE_FULL_ZOOM - LANDSCAPE_START_ZOOM),
  );

  useEffect(() => {
    const previous = previousUniverseLevel.current;
    previousUniverseLevel.current = universeLevel;

    if (previous < 2 && universeLevel === 2 && !selectedGalaxy) {
      const fit = window.setTimeout(() => {
        setCamera((current) => clampCamera({
          ...current,
          x: CENTER_X - current.width / 2,
          y: CENTER_Y - current.height / 2,
        }));
      }, 0);

      return () => window.clearTimeout(fit);
    }
  }, [selectedGalaxy, universeLevel]);

  const webGlDomains = useMemo(
    () => galaxies.map((galaxy, index) => {
      const position = overviewPositions[index];
      const compactProgress = smoothStep(clamp01((openingProgress - 0.58) / 0.42));
      const spread = mix(1.42, 1, compactProgress);
      return {
        id: galaxy.id,
        x: CENTER_X + ((position?.x ?? CENTER_X) - CENTER_X) * spread,
        y: CENTER_Y + ((position?.y ?? CENTER_Y) - CENTER_Y) * spread,
      };
    }),
    [galaxies, openingProgress, overviewPositions],
  );

  function handleUniverseWheel(
    event:
      React.WheelEvent<Element>,
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

  function zoomCamera(factor: number): void {
    setCamera((current) => clampCamera({
      x: current.x + current.width * (1 - factor) / 2,
      y: current.y + current.height * (1 - factor) / 2,
      width: current.width * factor,
      height: current.height * factor,
    }));
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
    libraryDiscoveries.length ===
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
    libraryDiscoveries.length ===
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
    <section className={universeLevel < 2 ? "galaxy-layout galaxy-layout-universe" : "galaxy-layout"}>
      <div className="galaxy-stage">
        <div className={universeLevel < 2 ? "galaxy-stage-header galaxy-stage-header-hidden" : "galaxy-stage-header"}>
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
                    libraryDiscoveries
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

          {!selectedGalaxy ? (
            <KnowledgeUniverseWebGl
              domains={webGlDomains}
              fingerprint={knowledgeLibrary?.graph?.sourceFingerprint ?? activeWorkspaceId}
              morph={openingProgress}
              onWheel={handleUniverseWheel}
              opacity={1 - smoothStep(landscapeProgress)}
            />
          ) : null}

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
              cursor: "grab",

              touchAction:
                "none",

              opacity: selectedGalaxy ? 1 : smoothStep(landscapeProgress),

              pointerEvents: selectedGalaxy || landscapeProgress >= 0.55 ? "auto" : "none",
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
                    const labelLines = splitGalaxyLabel(galaxy.label);

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
                        <title>{galaxy.label}</title>

                        <circle
                          cx={position.x}
                          cy={position.y}
                          fill="transparent"
                          r={position.radius * 1.38}
                        />

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
                            1.22
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
                            1.12
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
                            1.08
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
                                position.radius *
                                  1.22 +
                                18
                              }
                          >
                              {labelLines.map((line, lineIndex) => (
                                <tspan
                                  dy={lineIndex === 0 ? 0 : 16}
                                  key={`${galaxy.id}:label:${lineIndex}`}
                                  x={position.x}
                                >
                                  {line}
                                </tspan>
                              ))}
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

          {!selectedGalaxy ? (
            <div className="universe-zoom-controls" aria-label="Universumszoom">
              <button aria-label="Hineinzoomen" onClick={() => zoomCamera(0.78)} type="button">+</button>
              <button aria-label="Herauszoomen" onClick={() => zoomCamera(1.28)} type="button">−</button>
              <button aria-label="Universum zurücksetzen" onClick={() => setCamera(createInitialCamera())} type="button">↺</button>
            </div>
          ) : null}

          <div className="galaxy-control-hint">
            {selectedGalaxy
              ? "Ziehen zum Verschieben · Scrollen/Trackpad zum Zoomen · Planet anklicken zum Erkunden"
              : universeLevel < 2
                ? "Ziehen zum räumlichen Drehen · Scrollen/Trackpad zum Öffnen"
                : "Ziehen zum Verschieben · Scrollen/Trackpad zum Zoomen · Galaxie anklicken zum Erkunden"}
          </div>
        </div>
      </div>

      <aside className={universeLevel < 2 ? "galaxy-inspector galaxy-inspector-hidden" : "galaxy-inspector"}>
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
  if (!graph) {
    return [];
  }

  const nodesById =
    new Map(
      graph.nodes.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

  const discoveriesById =
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

  const clusterIds =
    buildDomainClusterIds(
      graph,
    );

  return graph.nodes
    .filter(
      (node) =>
        node.kind ===
          "domain" &&
        rootIds.has(
          node.id,
        ),
    )
    .map(
      (domain) => {
        const domainDiscoveries =
          mapGraphDiscoveries(
            collectGraphDiscoveryIds(
              domain.id,
              nodesById,
            ),
            discoveriesById,
          );

        const topics =
          domain.childIds
            .map(
              (childId) =>
                nodesById.get(
                  childId,
                ),
            )
            .filter(
              (
                node,
              ): node is KnowledgeGraph["nodes"][number] =>
                Boolean(node) &&
                node?.kind ===
                  "topic",
            )
            .map(
              (topic) => {
                const topicDiscoveries =
                  mapGraphDiscoveries(
                    collectGraphDiscoveryIds(
                      topic.id,
                      nodesById,
                    ),
                    discoveriesById,
                  );

                const stars =
                  topic.childIds
                    .map(
                      (childId) =>
                        nodesById.get(
                          childId,
                        ),
                    )
                    .filter(
                      (
                        node,
                      ): node is KnowledgeGraph["nodes"][number] =>
                        Boolean(node) &&
                        node?.kind ===
                          "subtopic",
                    )
                    .map(
                      (star) => {
                        const starDiscoveries =
                          mapGraphDiscoveries(
                            collectGraphDiscoveryIds(
                              star.id,
                              nodesById,
                            ),
                            discoveriesById,
                          );

                        return {
                          id: star.id,
                          label:
                            star.title,
                          count:
                            starDiscoveries.length,
                          discoveries:
                            starDiscoveries,
                        };
                      },
                    )
                    .filter(
                      (star) =>
                        star.count > 0,
                    );

                return {
                  id: topic.id,
                  label:
                    topic.title,
                  count:
                    topicDiscoveries.length,
                  discoveries:
                    topicDiscoveries,
                  stars,
                };
              },
            )
            .filter(
              (topic) =>
                topic.count > 0,
            )
            .sort(
              (left, right) =>
                right.count -
                left.count,
            );

        return {
          id: domain.id,
          key:
            normalizeGalaxyKey(
              domain.title,
            ),
          label:
            domain.title,
          count:
            domainDiscoveries.length,
          discoveries:
            domainDiscoveries,
          topics,
          clusterId:
            clusterIds.get(
              domain.id,
            ) ??
            domain.id,
        };
      },
    )
    .filter(
      (galaxy) =>
        galaxy.count > 0,
    )
    .sort(
      (left, right) =>
        right.count -
        left.count,
    );
}

function mapGraphDiscoveries(
  discoveryIds:
    Set<string>,
  discoveriesById:
    Map<string, Discovery>,
): Discovery[] {
  return [...discoveryIds]
    .map(
      (discoveryId) =>
        discoveriesById.get(
          discoveryId,
        ),
    )
    .filter(
      (
        discovery,
      ): discovery is Discovery =>
        Boolean(discovery),
    )
    .sort(
      (left, right) =>
        new Date(
          right.createdAt,
        ).getTime() -
        new Date(
          left.createdAt,
        ).getTime(),
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
  const bounds = {
    left: 390,
    right: 1410,
    top: 280,
    bottom: 870,
  };

  type LayoutNode = OverviewPosition & {
    galaxy: DomainGalaxy;
    index: number;
    leftExtent: number;
    rightExtent: number;
    topExtent: number;
    bottomExtent: number;
    anchorX: number;
    anchorY: number;
  };

  const nodes: LayoutNode[] = galaxies
    .map((galaxy, index) => {
      const radius = calculateGalaxyDisplayRadius(galaxy.count);
      const labelLines = splitGalaxyLabel(galaxy.label);
      const longestLine = Math.max(...labelLines.map((line) => line.length));
      const labelHalfWidth = Math.min(112, Math.max(42, longestLine * 6.4));
      const orbitExtent = radius * 1.22;
      const clusterSeed = seededNumber(`cluster:${galaxy.clusterId}`);
      const clusterAngle = clusterSeed * Math.PI * 2;
      const clusterDistance = 75 + seededNumber(`${galaxy.clusterId}:distance`) * 150;
      const anchorX = CENTER_X + Math.cos(clusterAngle) * clusterDistance * 1.75;
      const anchorY = CENTER_Y + Math.sin(clusterAngle) * clusterDistance;
      const seedAngle = seededNumber(`galaxy:${galaxy.id}:angle`) * Math.PI * 2;
      const seedDistance = 30 + seededNumber(`galaxy:${galaxy.id}:distance`) * 115;

      return {
        galaxy,
        index,
        radius,
        x: anchorX + Math.cos(seedAngle) * seedDistance,
        y: anchorY + Math.sin(seedAngle) * seedDistance,
        leftExtent: Math.max(orbitExtent, labelHalfWidth) + 14,
        rightExtent: Math.max(orbitExtent, labelHalfWidth) + 14,
        topExtent: orbitExtent + 14,
        bottomExtent: radius * 1.22 + 28 + labelLines.length * 16,
        anchorX,
        anchorY,
      };
    })
    .sort((left, right) =>
      right.radius - left.radius || left.galaxy.id.localeCompare(right.galaxy.id),
    );

  const clampNode = (node: LayoutNode) => {
    node.x = Math.max(
      bounds.left + node.leftExtent,
      Math.min(bounds.right - node.rightExtent, node.x),
    );
    node.y = Math.max(
      bounds.top + node.topExtent,
      Math.min(bounds.bottom - node.bottomExtent, node.y),
    );
  };

  const separateNodes = (strength: number) => {
    for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
      const left = nodes[leftIndex]!;

      for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
        const right = nodes[rightIndex]!;
        const overlapX = Math.min(
          left.x + left.rightExtent,
          right.x + right.rightExtent,
        ) - Math.max(
          left.x - left.leftExtent,
          right.x - right.leftExtent,
        );
        const overlapY = Math.min(
          left.y + left.bottomExtent,
          right.y + right.bottomExtent,
        ) - Math.max(
          left.y - left.topExtent,
          right.y - right.topExtent,
        );

        if (overlapX <= 0 || overlapY <= 0) continue;

        const directionX = right.x === left.x
          ? (seededNumber(`${left.galaxy.id}:${right.galaxy.id}:x`) < 0.5 ? -1 : 1)
          : Math.sign(right.x - left.x);
        const directionY = right.y === left.y
          ? (seededNumber(`${left.galaxy.id}:${right.galaxy.id}:y`) < 0.5 ? -1 : 1)
          : Math.sign(right.y - left.y);

        if (overlapX / (left.leftExtent + right.rightExtent) < overlapY / (left.topExtent + right.bottomExtent)) {
          const push = (overlapX / 2 + 1) * strength;
          left.x -= directionX * push;
          right.x += directionX * push;
        } else {
          const push = (overlapY / 2 + 1) * strength;
          left.y -= directionY * push;
          right.y += directionY * push;
        }
      }
    }

    nodes.forEach(clampNode);
  };

  nodes.forEach(clampNode);

  for (let iteration = 0; iteration < 180; iteration += 1) {
    nodes.forEach((node) => {
      node.x += (node.anchorX - node.x) * 0.004;
      node.y += (node.anchorY - node.y) * 0.004;
    });
    separateNodes(0.76);
  }

  for (let iteration = 0; iteration < 160; iteration += 1) {
    separateNodes(1);
  }

  const positions: OverviewPosition[] = new Array(galaxies.length);
  nodes.forEach((node) => {
    positions[node.index] = {
      x: node.x,
      y: node.y,
      radius: node.radius,
    };
  });

  return positions;
}

function calculateGalaxyDisplayRadius(
  count: number,
): number {
  return Math.max(32, Math.min(50, 29 + Math.sqrt(Math.max(1, count)) * 5.2));
}

function splitGalaxyLabel(value: string): string[] {
  const words = value.trim().split(/\s+/);
  if (value.length <= 22 || words.length === 1) return [value];

  let bestIndex = 1;
  let bestDifference = Number.POSITIVE_INFINITY;

  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    const difference = Math.abs(first.length - second.length);
    if (difference < bestDifference) {
      bestIndex = index;
      bestDifference = difference;
    }
  }

  return [
    words.slice(0, bestIndex).join(" "),
    words.slice(bestIndex).join(" "),
  ];
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothStep(value: number): number {
  const clamped = clamp01(value);
  return clamped * clamped * (3 - 2 * clamped);
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}
