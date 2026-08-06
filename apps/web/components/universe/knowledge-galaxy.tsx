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

import type {
  GalaxyConnection,
  GalaxyNode,
} from "@/types/galaxy";

const WIDTH =
  1200;

const HEIGHT =
  720;

const CENTER_X =
  WIDTH / 2;

const CENTER_Y =
  HEIGHT / 2;

const categoryLabels:
Record<string, string> = {
  technology:
    "Technologie",
  finance:
    "Finanzen",
  business:
    "Business",
  science:
    "Wissenschaft",
  health:
    "Gesundheit",
  education:
    "Bildung",
  productivity:
    "Produktivität",
  culture:
    "Kultur",
  news:
    "Nachrichten",
  lifestyle:
    "Lifestyle",
  other:
    "Weitere",
};

type GalaxyModel = {
  nodes: GalaxyNode[];
  connections:
    GalaxyConnection[];
};

export function KnowledgeGalaxy() {
  const {
    workspaceDiscoveries,
    isLoading,
  } =
    useDiscoveries();

  const [
    selectedNodeId,
    setSelectedNodeId,
  ] =
    useState<string | null>(
      null,
    );

  const model =
    useMemo(
      () =>
        createGalaxyModel(
          workspaceDiscoveries,
        ),
      [workspaceDiscoveries],
    );

  const selectedNode =
    model.nodes.find(
      (node) =>
        node.id ===
        selectedNodeId,
    ) ?? null;

  const selectedDiscoveries =
    useMemo(
      () =>
        selectedNode
          ? getNodeDiscoveries(
              workspaceDiscoveries,
              selectedNode,
            )
          : [],
      [
        selectedNode,
        workspaceDiscoveries,
      ],
    );

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
          Noch keine Galaxie
        </h3>

        <p>
          Sobald du Inhalte erfasst,
          entstehen hier automatisch
          Domänen, Themen und fachliche
          Verbindungen.
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
              KNOWLEDGE GALAXY
            </div>

            <h2>
              Dein Wissensuniversum
            </h2>

            <p>
              Große Knoten sind Domänen.
              Kleinere Knoten zeigen
              Themen innerhalb dieser
              Domänen.
            </p>
          </div>

          <div className="galaxy-statistics">
            <div>
              <strong>
                {
                  model.nodes.filter(
                    (node) =>
                      node.type ===
                      "domain",
                  ).length
                }
              </strong>

              <span>
                Domänen
              </span>
            </div>

            <div>
              <strong>
                {
                  model.nodes.filter(
                    (node) =>
                      node.type ===
                      "topic",
                  ).length
                }
              </strong>

              <span>
                Themen
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

        <div className="galaxy-canvas-wrapper">
          <div className="galaxy-stars" />

          <svg
            aria-label="Interaktive Wissensgalaxie"
            className="galaxy-canvas"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            <defs>
              <radialGradient
                id="galaxy-core-gradient"
              >
                <stop
                  offset="0%"
                  stopColor="#d9f7ff"
                />

                <stop
                  offset="32%"
                  stopColor="#73d8ff"
                />

                <stop
                  offset="100%"
                  stopColor="#0f6d9b"
                />
              </radialGradient>

              <filter
                height="300%"
                id="galaxy-glow"
                width="300%"
                x="-100%"
                y="-100%"
              >
                <feGaussianBlur
                  result="blur"
                  stdDeviation="8"
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

              <linearGradient
                id="galaxy-line-gradient"
                x1="0%"
                x2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="#2d91bc"
                  stopOpacity="0.14"
                />

                <stop
                  offset="50%"
                  stopColor="#73d8ff"
                  stopOpacity="0.58"
                />

                <stop
                  offset="100%"
                  stopColor="#2d91bc"
                  stopOpacity="0.14"
                />
              </linearGradient>
            </defs>

            <g className="galaxy-orbits">
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r="148"
              />

              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r="255"
              />

              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r="345"
              />
            </g>

            <g className="galaxy-connections">
              {model.connections.map(
                (connection) => {
                  const source =
                    model.nodes.find(
                      (node) =>
                        node.id ===
                        connection.sourceId,
                    );

                  const target =
                    model.nodes.find(
                      (node) =>
                        node.id ===
                        connection.targetId,
                    );

                  if (
                    !source ||
                    !target
                  ) {
                    return null;
                  }

                  const highlighted =
                    selectedNodeId ===
                      source.id ||
                    selectedNodeId ===
                      target.id;

                  return (
                    <line
                      className={
                        highlighted
                          ? "galaxy-connection galaxy-connection-highlighted"
                          : "galaxy-connection"
                      }
                      key={
                        connection.id
                      }
                      x1={
                        source.x
                      }
                      x2={
                        target.x
                      }
                      y1={
                        source.y
                      }
                      y2={
                        target.y
                      }
                    />
                  );
                },
              )}
            </g>

            <g className="galaxy-nodes">
              {model.nodes.map(
                (node) => {
                  const selected =
                    node.id ===
                    selectedNodeId;

                  return (
                    <g
                      className={
                        `galaxy-node galaxy-node-${node.type}` +
                        (
                          selected
                            ? " galaxy-node-selected"
                            : ""
                        )
                      }
                      key={
                        node.id
                      }
                      onClick={() => {
                        setSelectedNodeId(
                          selected
                            ? null
                            : node.id,
                        );
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <circle
                        className="galaxy-node-halo"
                        cx={node.x}
                        cy={node.y}
                        r={
                          node.radius +
                          13
                        }
                      />

                      <circle
                        className="galaxy-node-core"
                        cx={node.x}
                        cy={node.y}
                        r={
                          node.radius
                        }
                      />

                      {node.type !==
                      "topic" ? (
                        <circle
                          className="galaxy-node-ring"
                          cx={node.x}
                          cy={node.y}
                          r={
                            node.radius +
                            5
                          }
                        />
                      ) : null}

                      <text
                        className="galaxy-node-label"
                        textAnchor="middle"
                        x={node.x}
                        y={
                          node.y +
                          node.radius +
                          25
                        }
                      >
                        {shortenLabel(
                          node.label,
                          node.type ===
                            "topic"
                            ? 20
                            : 24,
                        )}
                      </text>

                      <text
                        className="galaxy-node-count"
                        textAnchor="middle"
                        x={node.x}
                        y={
                          node.y + 5
                        }
                      >
                        {node.count}
                      </text>
                    </g>
                  );
                },
              )}
            </g>
          </svg>

          <div className="galaxy-control-hint">
            Knoten anklicken, um Details
            anzuzeigen
          </div>
        </div>
      </div>

      <aside className="galaxy-inspector">
        {selectedNode ? (
          <>
            <div className="card-eyebrow">
              {selectedNode.type ===
              "core"
                ? "WISSENSKERN"
                : selectedNode.type ===
                    "domain"
                  ? "DOMÄNE"
                  : "THEMA"}
            </div>

            <h3>
              {selectedNode.label}
            </h3>

            <div className="galaxy-inspector-count">
              <strong>
                {selectedNode.count}
              </strong>

              <span>
                zugeordnete{" "}
                {selectedNode.count ===
                1
                  ? "Discovery"
                  : "Discoveries"}
              </span>
            </div>

            <div className="galaxy-inspector-list">
              {selectedDiscoveries
                .slice(0, 8)
                .map(
                  (discovery) => (
                    <article
                      key={
                        discovery.id
                      }
                    >
                      <strong>
                        {discovery
                          .improvedTitle ||
                          discovery.title}
                      </strong>

                      {discovery
                        .summary ? (
                        <p>
                          {
                            discovery
                              .summary
                          }
                        </p>
                      ) : null}
                    </article>
                  ),
                )}
            </div>

            {selectedDiscoveries.length >
            8 ? (
              <div className="galaxy-inspector-more">
                +
                {selectedDiscoveries.length -
                  8}{" "}
                weitere Inhalte
              </div>
            ) : null}
          </>
        ) : (
          <div className="galaxy-inspector-empty">
            <div className="galaxy-inspector-symbol">
              ✦
            </div>

            <h3>
              Galaxie erkunden
            </h3>

            <p>
              Wähle eine Domäne oder ein
              Thema aus, um die darin
              enthaltenen Discoveries zu
              sehen.
            </p>

            <div className="galaxy-legend">
              <div>
                <span className="legend-node legend-node-core" />

                Wissenskern
              </div>

              <div>
                <span className="legend-node legend-node-domain" />

                Domäne
              </div>

              <div>
                <span className="legend-node legend-node-topic" />

                Thema
              </div>
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}

function createGalaxyModel(
  discoveries: Discovery[],
): GalaxyModel {
  const nodes:
    GalaxyNode[] = [];

  const connections:
    GalaxyConnection[] = [];

  const coreNode:
    GalaxyNode = {
      id:
        "core:savewise",

      label:
        "Mein Wissen",

      type:
        "core",

      count:
        discoveries.length,

      x:
        CENTER_X,

      y:
        CENTER_Y,

      radius:
        46,

      parentId:
        null,
    };

  nodes.push(
    coreNode,
  );

  const domainMap =
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
        ?.primaryCategory ??
      "other";

    const current =
      domainMap.get(
        domain,
      ) ?? [];

    current.push(
      discovery,
    );

    domainMap.set(
      domain,
      current,
    );
  }

  const domains =
    [...domainMap.entries()]
      .sort(
        (
          left,
          right,
        ) =>
          right[1].length -
          left[1].length,
      )
      .slice(0, 10);

  domains.forEach(
    (
      [domain, items],
      domainIndex,
    ) => {
      const angle =
        (
          Math.PI *
          2 *
          domainIndex
        ) /
          Math.max(
            domains.length,
            1,
          ) -
        Math.PI / 2;

      const domainDistance =
        domains.length <= 5
          ? 245
          : 280;

      const domainNode:
        GalaxyNode = {
        id:
          `domain:${domain}`,

        label:
          categoryLabels[
            domain
          ] ?? domain,

        type:
          "domain",

        count:
          items.length,

        x:
          CENTER_X +
          Math.cos(angle) *
            domainDistance,

        y:
          CENTER_Y +
          Math.sin(angle) *
            domainDistance,

        radius:
          Math.min(
            36,
            24 +
              Math.sqrt(
                items.length,
              ) *
                3,
          ),

        parentId:
          coreNode.id,
      };

      nodes.push(
        domainNode,
      );

      connections.push({
        id:
          `${coreNode.id}->${domainNode.id}`,

        sourceId:
          coreNode.id,

        targetId:
          domainNode.id,
      });

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
          ) ?? [];

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
          .slice(0, 6);

      topics.forEach(
        (
          [topic, topicItems],
          topicIndex,
        ) => {
          const topicSpread =
            Math.PI * 0.82;

          const topicAngle =
            angle -
            topicSpread / 2 +
            (
              topicSpread *
              (
                topicIndex +
                0.5
              )
            ) /
              Math.max(
                topics.length,
                1,
              );

          const topicDistance =
            92 +
            (
              topicIndex % 2
            ) *
              20;

          const topicNode:
            GalaxyNode = {
            id:
              `topic:${domain}:${topic}`,

            label:
              topic,

            type:
              "topic",

            count:
              topicItems.length,

            x:
              clamp(
                domainNode.x +
                  Math.cos(
                    topicAngle,
                  ) *
                    topicDistance,
                45,
                WIDTH - 45,
              ),

            y:
              clamp(
                domainNode.y +
                  Math.sin(
                    topicAngle,
                  ) *
                    topicDistance,
                45,
                HEIGHT - 45,
              ),

            radius:
              Math.min(
                19,
                11 +
                  Math.sqrt(
                    topicItems.length,
                  ) *
                    2.2,
              ),

            parentId:
              domainNode.id,
          };

          nodes.push(
            topicNode,
          );

          connections.push({
            id:
              `${domainNode.id}->${topicNode.id}`,

            sourceId:
              domainNode.id,

            targetId:
              topicNode.id,
          });
        },
      );
    },
  );

  return {
    nodes,
    connections,
  };
}

function getNodeDiscoveries(
  discoveries: Discovery[],
  node: GalaxyNode,
): Discovery[] {
  if (
    node.type ===
    "core"
  ) {
    return [...discoveries]
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

  if (
    node.type ===
    "domain"
  ) {
    const domain =
      node.id.replace(
        "domain:",
        "",
      );

    return discoveries.filter(
      (discovery) =>
        (
          discovery.classification
            ?.primaryCategory ??
          "other"
        ) === domain,
    );
  }

  const [
    ,
    domain,
    ...topicParts
  ] =
    node.id.split(":");

  const topic =
    topicParts.join(":");

  return discoveries.filter(
    (discovery) => {
      const discoveryDomain =
        discovery.classification
          ?.primaryCategory ??
        "other";

      const discoveryTopic =
        discovery.classification
          ?.topic?.trim() ||
        discovery.topics?.[0]
          ?.trim() ||
        "Weitere Themen";

      return (
        discoveryDomain ===
          domain &&
        discoveryTopic ===
          topic
      );
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

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}
