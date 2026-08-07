"use client";

import type {
  Discovery,
  KnowledgeAnswer,
  KnowledgeGraphNode,
  KnowledgeLibrary,
} from "@savewise/shared";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DiscoveryViewerModal,
} from "@/components/universe/discovery-viewer-modal";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

import {
  askKnowledge,
  getKnowledgeLibrary,
} from "@/services/knowledge-client";

type AiAction =
  | "summary"
  | "connections"
  | "gaps";

export function KnowledgeWorkspace() {
  const {
    activeWorkspaceId,
  } = useWorkspace();

  const [
    library,
    setLibrary,
  ] =
    useState<KnowledgeLibrary | null>(
      null,
    );

  const [
    path,
    setPath,
  ] =
    useState<string[]>([]);

  const [
    selectedDiscovery,
    setSelectedDiscovery,
  ] =
    useState<Discovery | null>(
      null,
    );

  const [
    aiAnswer,
    setAiAnswer,
  ] =
    useState<KnowledgeAnswer | null>(
      null,
    );

  const [
    aiLoading,
    setAiLoading,
  ] =
    useState(false);

  const [
    isLoading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const loadLibrary =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await getKnowledgeLibrary(
              activeWorkspaceId,
            );

          setLibrary(result);
          setPath([]);
          setAiAnswer(null);
        } catch (loadError) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Die Wissensbibliothek konnte nicht geladen werden.",
          );
        } finally {
          setLoading(false);
        }
      },
      [activeWorkspaceId],
    );

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);


  const graph =
    library?.graph ?? null;

  const nodesById =
    useMemo(
      () =>
        new Map(
          (graph?.nodes ?? []).map(
            (node) => [
              node.id,
              node,
            ],
          ),
        ),
      [graph],
    );

  const activeNode =
    path.length > 0
      ? nodesById.get(
          path[path.length - 1],
        ) ?? null
      : null;

  const galaxyNodes =
    useMemo(
      () =>
        (graph?.rootNodeIds ?? [])
          .map(
            (nodeId) =>
              nodesById.get(nodeId),
          )
          .filter(
            (
              node,
            ): node is KnowledgeGraphNode =>
              node !== undefined,
          )
          .filter(
            (node) =>
              node.kind === "domain",
          )
          .sort(
            (left, right) =>
              countDiscoveries(
                right,
                nodesById,
              ) -
              countDiscoveries(
                left,
                nodesById,
              ),
          ),
      [
        graph,
        nodesById,
      ],
    );

  const visibleChildren =
    useMemo(() => {
      if (!activeNode) {
        return galaxyNodes;
      }

      const expectedKind =
        activeNode.kind === "domain"
          ? "topic"
          : activeNode.kind === "topic"
            ? "subtopic"
            : null;

      if (!expectedKind) {
        return [];
      }

      return activeNode.childIds
        .map(
          (nodeId) =>
            nodesById.get(nodeId),
        )
        .filter(
          (
            node,
          ): node is KnowledgeGraphNode =>
            node !== undefined,
        )
        .filter(
          (node) =>
            node.kind === expectedKind,
        )
        .sort(
          (left, right) =>
            countDiscoveries(
              right,
              nodesById,
            ) -
            countDiscoveries(
              left,
              nodesById,
            ),
        );
    }, [
      activeNode,
      galaxyNodes,
      nodesById,
    ]);

  const visibleDiscoveries =
    useMemo(() => {
      if (
        !library ||
        !activeNode
      ) {
        return [];
      }

      if (
        activeNode.kind !== "subtopic" &&
        visibleChildren.length > 0
      ) {
        return [];
      }

      const ids =
        collectDiscoveryIds(
          activeNode,
          nodesById,
        );

      return library.discoveries
        .filter(
          (discovery) =>
            ids.has(discovery.id),
        );
    }, [
      activeNode,
      library,
      nodesById,
      visibleChildren,
    ]);

  function openNode(
    node: KnowledgeGraphNode,
  ) {
    setPath(
      (current) => [
        ...current,
        node.id,
      ],
    );

    setAiAnswer(null);
  }

  function goRoot() {
    setPath([]);
    setAiAnswer(null);
  }

  function goToPath(
    index: number,
  ) {
    setPath(
      (current) =>
        current.slice(
          0,
          index + 1,
        ),
    );

    setAiAnswer(null);
  }

  async function runAi(
    action: AiAction,
  ) {
    const context =
      activeNode
        ? `${nodeKindLabel(
            activeNode.kind,
          )} "${activeNode.title}"`
        : "mein gesamtes Wissensuniversum";

    const question =
      action === "summary"
        ? `Fasse ${context} auf Basis meines gespeicherten Wissens zusammen. Erkläre die wichtigsten Erkenntnisse und nenne relevante Zusammenhänge.`
        : action === "connections"
          ? `Welche wichtigen Zusammenhänge erkennst du innerhalb von ${context}? Zeige Verbindungen zwischen meinen gespeicherten Discoveries, Topics und Unterthemen.`
          : `Welche Wissenslücken erkennst du in ${context}? Nenne konkret, was in meinen gespeicherten Inhalten noch fehlt oder nur schwach belegt ist.`;

    setAiLoading(true);
    setError(null);

    try {
      const answer =
        await askKnowledge(
          activeWorkspaceId,
          question,
        );

      setAiAnswer(answer);
    } catch (aiError) {
      setError(
        aiError instanceof Error
          ? aiError.message
          : "Die KI-Analyse konnte nicht durchgeführt werden.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="knowledge-page">
      <header className="hero">
        <div>
          <div className="eyebrow">
            SAVEWISE · WISSEN
          </div>

          <h1>
            Deine Wissensbibliothek
          </h1>

          <p>
            Galaxien, Topics,
            Unterthemen und Discoveries –
            automatisch aus deinem
            gespeicherten Wissen aufgebaut.
          </p>
        </div>

        <div className="hero-actions">
          <span className="workspace-pill">
            {activeWorkspaceId ===
            "private"
              ? "Privat"
              : "Geschäftlich"}
          </span>

          <button
            className="secondary-button"
            disabled={isLoading}
            onClick={() => {
              void loadLibrary();
            }}
            type="button"
          >
            ↻ Aktualisieren
          </button>


        </div>
      </header>

      {error ? (
        <div className="error-card">
          {error}
        </div>
      ) : null}

      {isLoading && !library ? (
        <div className="loading-card">
          Wissensbibliothek wird geladen …
        </div>
      ) : null}

      {library ? (
        <>
          <section className="statistics-grid">
            <StatisticCard
              label="Discoveries"
              value={
                library.discoveries.length
              }
            />

            <StatisticCard
              label="Galaxien"
              value={
                galaxyNodes.length
              }
            />

            <StatisticCard
              label="Planeten"
              value={
                graph?.nodes.filter(
                  (node) =>
                    node.kind ===
                    "topic",
                ).length ?? 0
              }
            />

            <StatisticCard
              label="Verbindungen"
              value={
                graph?.relations.length ??
                library.relations.length
              }
            />
          </section>

          {!graph ? (
            <EmptyState
              title="Noch kein Wissensgraph"
              text="Sobald SaveWise genügend Discoveries analysiert hat, entsteht hier dein Wissensuniversum."
            />
          ) : (
            <>
              <section className="section">
                <div className="section-eyebrow">
                  PERSÖNLICHES PROFIL
                </div>

                <h2>
                  {activeNode
                    ? nodeKindHeading(
                        activeNode.kind,
                      )
                    : "Deine stärksten Galaxien"}
                </h2>

                <p className="section-description">
                  {activeNode
                    ? activeNode.description ||
                      navigationDescription(
                        activeNode.kind,
                      )
                    : "Deine größten Wissensbereiche, abgeleitet aus deinen gespeicherten Discoveries."}
                </p>

                {path.length > 0 ? (
                  <div className="breadcrumbs">
                    <button
                      onClick={goRoot}
                      type="button"
                    >
                      Alle Galaxien
                    </button>

                    {path.map(
                      (
                        nodeId,
                        index,
                      ) => {
                        const node =
                          nodesById.get(
                            nodeId,
                          );

                        if (!node) {
                          return null;
                        }

                        return (
                          <span
                            key={nodeId}
                          >
                            <b>›</b>

                            <button
                              disabled={
                                index ===
                                path.length -
                                  1
                              }
                              onClick={() =>
                                goToPath(
                                  index,
                                )
                              }
                              type="button"
                            >
                              {node.title}
                            </button>
                          </span>
                        );
                      },
                    )}
                  </div>
                ) : null}

                {visibleChildren.length >
                0 ? (
                  <div className="node-grid">
                    {visibleChildren.map(
                      (node) => (
                        <button
                          className="node-card"
                          key={node.id}
                          onClick={() =>
                            openNode(node)
                          }
                          type="button"
                        >
                          <div className="node-type">
                            {nodeKindLabel(
                              node.kind,
                            )}
                          </div>

                          <strong>
                            {node.title}
                          </strong>

                          <p>
                            {node.description ||
                              navigationDescription(
                                node.kind,
                              )}
                          </p>

                          <div className="node-footer">
                            <span>
                              {countDiscoveries(
                                node,
                                nodesById,
                              )}{" "}
                              Discoveries
                            </span>

                            <span className="open-label">
                              Öffnen →
                            </span>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                ) : null}

                {visibleDiscoveries.length >
                0 ? (
                  <div className="discoveries-section">
                    <div className="subheading">
                      Zugehörige Discoveries
                    </div>

                    <div className="discovery-grid">
                      {visibleDiscoveries.map(
                        (discovery) => (
                          <button
                            className="discovery-card"
                            key={
                              discovery.id
                            }
                            onClick={() =>
                              setSelectedDiscovery(
                                discovery,
                              )
                            }
                            type="button"
                          >
                            <div className="discovery-label">
                              DISCOVERY
                            </div>

                            <strong>
                              {discovery.improvedTitle ||
                                discovery.title}
                            </strong>

                            {discovery.summary ? (
                              <p>
                                {
                                  discovery.summary
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
                  </div>
                ) : null}
              </section>

              <section className="section ai-section">
                <div>
                  <div className="section-eyebrow">
                    SAVEWISE KI
                  </div>

                  <h2>
                    Wissen analysieren
                  </h2>

                  <p className="section-description">
                    Die KI arbeitet nur mit
                    deinem gespeicherten
                    SaveWise-Wissen und dem
                    aktuell geöffneten
                    Bereich.
                  </p>
                </div>

                <div className="ai-actions">
                  <button
                    disabled={aiLoading}
                    onClick={() => {
                      void runAi(
                        "summary",
                      );
                    }}
                    type="button"
                  >
                    ✦ KI-Zusammenfassung
                  </button>

                  <button
                    disabled={aiLoading}
                    onClick={() => {
                      void runAi(
                        "connections",
                      );
                    }}
                    type="button"
                  >
                    ⟷ Zusammenhänge
                  </button>

                  <button
                    disabled={aiLoading}
                    onClick={() => {
                      void runAi(
                        "gaps",
                      );
                    }}
                    type="button"
                  >
                    ◇ Wissenslücken
                  </button>
                </div>

                {aiLoading ? (
                  <div className="ai-loading">
                    SaveWise analysiert dein
                    Wissen …
                  </div>
                ) : null}

                {aiAnswer ? (
                  <div className="ai-result">
                    <div className="confidence">
                      KI ·{" "}
                      {Math.round(
                        aiAnswer.confidence *
                          100,
                      )}
                      % Konfidenz
                    </div>

                    <h3>
                      Analyse
                    </h3>

                    <p className="answer">
                      {aiAnswer.answer}
                    </p>

                    {aiAnswer.synthesis
                      .practicalConclusions
                      .length > 0 ? (
                      <div className="result-block">
                        <h4>
                          Schlussfolgerungen
                        </h4>

                        <ul>
                          {aiAnswer.synthesis.practicalConclusions.map(
                            (
                              conclusion,
                            ) => (
                              <li
                                key={
                                  conclusion
                                }
                              >
                                {
                                  conclusion
                                }
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    ) : null}

                    {aiAnswer.synthesis
                      .openQuestions
                      .length > 0 ? (
                      <div className="result-block">
                        <h4>
                          Offene Fragen
                        </h4>

                        <ul>
                          {aiAnswer.synthesis.openQuestions.map(
                            (
                              question,
                            ) => (
                              <li
                                key={
                                  question
                                }
                              >
                                {question}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    ) : null}

                    {aiAnswer.insufficientKnowledge ? (
                      <div className="knowledge-gap">
                        <strong>
                          Fehlendes Wissen
                        </strong>

                        <p>
                          {
                            aiAnswer.insufficientKnowledge
                          }
                        </p>
                      </div>
                    ) : null}

                    {aiAnswer.citations
                      .length > 0 ? (
                      <div className="result-block">
                        <h4>
                          Verwendete Discoveries
                        </h4>

                        <div className="citation-list">
                          {aiAnswer.citations.map(
                            (
                              citation,
                            ) => (
                              <div
                                className="citation"
                                key={`${citation.discoveryId}-${citation.contribution}`}
                              >
                                <strong>
                                  {
                                    citation.title
                                  }
                                </strong>

                                <p>
                                  {
                                    citation.contribution
                                  }
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </>
          )}
        </>
      ) : null}

      <DiscoveryViewerModal
        discovery={
          selectedDiscovery
        }
        onClose={() => {
          setSelectedDiscovery(
            null,
          );
        }}
      />

      <style jsx>{`
        .knowledge-page {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 36px 42px 80px;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 30px;
          margin-bottom: 32px;
        }

        .eyebrow,
        .section-eyebrow {
          color: #4d7df0;
          font-weight: 850;
          letter-spacing: 0.13em;
        }

        .eyebrow {
          font-size: 12px;
          margin-bottom: 10px;
        }

        .section-eyebrow {
          font-size: 13px;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: clamp(
            32px,
            3vw,
            45px
          );
          color: #eaf0fb;
          letter-spacing: -0.035em;
        }

        .hero > div > p {
          margin: 12px 0 0;
          color: #aab6ca;
          font-size: 16px;
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          gap: 10px;
        }

        .workspace-pill,
        .secondary-button {
          min-height: 42px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.13
            );
          border-radius: 12px;
          background: rgba(
            255,
            255,
            255,
            0.06
          );
          color: #dce5f4;
          font-size: 13px;
          font-weight: 750;
        }

        .workspace-pill {
          display: flex;
          align-items: center;
          padding: 0 15px;
        }

        .secondary-button {
          padding: 0 15px;
          cursor: pointer;
        }

        .statistics-grid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 14px;
          margin-bottom: 48px;
        }

        .section {
          margin-top: 54px;
        }

        .section h2 {
          color: #e9eef8;
          font-size: 28px;
          line-height: 1.2;
          margin: 0;
          letter-spacing: -0.025em;
        }

        .section-description {
          color: #aeb9cc;
          font-size: 15px;
          line-height: 1.65;
          max-width: 760px;
          margin: 8px 0 0;
        }

        .breadcrumbs {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-top: 24px;
        }

        .breadcrumbs span {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .breadcrumbs b {
          color: #66738b;
        }

        .breadcrumbs button {
          border: 0;
          padding: 0;
          background: none;
          color: #7da0ff;
          font-size: 14px;
          cursor: pointer;
        }

        .breadcrumbs button:disabled {
          color: #dce5f4;
          font-weight: 750;
          cursor: default;
        }

        .node-grid {
          display: grid;
          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );
          gap: 16px;
          margin-top: 25px;
        }

        .node-card {
          text-align: left;
          min-height: 190px;
          padding: 22px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.11
            );
          border-radius: 19px;
          background: rgba(
            255,
            255,
            255,
            0.045
          );
          cursor: pointer;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .node-card:hover {
          transform: translateY(-3px);
          border-color: rgba(
            90,
            133,
            255,
            0.55
          );
          background: rgba(
            255,
            255,
            255,
            0.07
          );
        }

        .node-type,
        .discovery-label {
          color: #7298ff;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.11em;
        }

        .node-card > strong {
          display: block;
          color: #eff4fc;
          font-size: 18px;
          line-height: 1.35;
          margin-top: 11px;
        }

        .node-card > p {
          color: #9da9bd;
          font-size: 14px;
          line-height: 1.55;
          margin: 9px 0 18px;
        }

        .node-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          color: #8794aa;
          font-size: 13px;
        }

        .open-label {
          color: #7ca0ff;
          font-weight: 750;
        }

        .discoveries-section {
          margin-top: 28px;
        }

        .subheading {
          color: #dce5f4;
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 14px;
        }

        .discovery-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 14px;
        }

        .discovery-card {
          text-align: left;
          padding: 20px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.11
            );
          border-radius: 17px;
          background: rgba(
            255,
            255,
            255,
            0.045
          );
          cursor: pointer;
        }

        .discovery-card strong {
          display: block;
          color: #edf3fc;
          font-size: 17px;
          line-height: 1.4;
          margin-top: 9px;
        }

        .discovery-card p {
          color: #a0acbf;
          font-size: 14px;
          line-height: 1.55;
          margin: 9px 0;
        }

        .discovery-card > span {
          color: #7ca0ff;
          font-size: 13px;
          font-weight: 750;
        }

        .ai-section {
          border-top: 1px solid
            rgba(
              255,
              255,
              255,
              0.09
            );
          padding-top: 46px;
        }

        .ai-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .ai-actions button {
          min-height: 44px;
          padding: 0 16px;
          border: 1px solid
            rgba(
              91,
              133,
              255,
              0.38
            );
          border-radius: 12px;
          background: rgba(
            62,
            104,
            220,
            0.12
          );
          color: #cddaff;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
        }

        .ai-actions button:hover {
          background: rgba(
            62,
            104,
            220,
            0.22
          );
        }

        .ai-actions button:disabled {
          opacity: 0.5;
        }

        .ai-loading {
          margin-top: 20px;
          color: #aeb9cc;
          font-size: 14px;
        }

        .ai-result {
          margin-top: 24px;
          padding: 28px;
          border: 1px solid
            rgba(
              102,
              140,
              255,
              0.24
            );
          border-radius: 20px;
          background: rgba(
            255,
            255,
            255,
            0.045
          );
        }

        .confidence {
          color: #78a0ff;
          font-size: 12px;
          font-weight: 800;
        }

        .ai-result h3 {
          color: #eef3fb;
          font-size: 22px;
          margin: 8px 0 12px;
        }

        .answer {
          color: #ccd5e4;
          font-size: 15px;
          line-height: 1.75;
          white-space: pre-wrap;
        }

        .result-block {
          margin-top: 24px;
        }

        .result-block h4 {
          color: #e5ebf5;
          font-size: 16px;
          margin-bottom: 10px;
        }

        .result-block li {
          color: #b5c0d2;
          font-size: 14px;
          line-height: 1.65;
          margin-bottom: 6px;
        }

        .knowledge-gap {
          margin-top: 24px;
          padding: 17px;
          border-radius: 14px;
          background: rgba(
            224,
            165,
            63,
            0.09
          );
          border: 1px solid
            rgba(
              224,
              165,
              63,
              0.22
            );
        }

        .knowledge-gap strong {
          color: #efc26b;
          font-size: 14px;
        }

        .knowledge-gap p {
          color: #c4b797;
          font-size: 14px;
          line-height: 1.6;
          margin: 6px 0 0;
        }

        .citation-list {
          display: grid;
          gap: 9px;
        }

        .citation {
          padding: 13px 15px;
          border-radius: 12px;
          background: rgba(
            255,
            255,
            255,
            0.04
          );
        }

        .citation strong {
          color: #dfe7f5;
          font-size: 14px;
        }

        .citation p {
          color: #9eabbf;
          font-size: 13px;
          line-height: 1.5;
          margin: 4px 0 0;
        }

        .loading-card,
        .error-card {
          padding: 20px;
          border-radius: 15px;
          margin-bottom: 20px;
          color: #dbe4f2;
          font-size: 14px;
          background: rgba(
            255,
            255,
            255,
            0.05
          );
        }

        .error-card {
          color: #f2b0b0;
        }

        @media (
          max-width: 1100px
        ) {
          .statistics-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .node-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        @media (
          max-width: 760px
        ) {
          .knowledge-page {
            padding:
              26px 18px 60px;
          }

          .hero {
            flex-direction: column;
          }

          .statistics-grid,
          .node-grid,
          .discovery-grid {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>
    </div>
  );
}

function StatisticCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="statistic-card">
      <strong>{value}</strong>
      <span>{label}</span>

      <style jsx>{`
        .statistic-card {
          min-height: 115px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 20px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.1
            );
          border-radius: 17px;
          background: rgba(
            255,
            255,
            255,
            0.045
          );
        }

        strong {
          color: #79a0ff;
          font-size: 31px;
          line-height: 1;
        }

        span {
          color: #aab5c8;
          font-size: 13px;
          font-weight: 700;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>

      <style jsx>{`
        .empty-state {
          padding: 22px;
          border: 1px dashed
            rgba(
              255,
              255,
              255,
              0.15
            );
          border-radius: 16px;
        }

        strong {
          color: #e4ebf6;
          font-size: 16px;
        }

        p {
          color: #9daabd;
          font-size: 14px;
          margin: 6px 0 0;
        }
      `}</style>
    </div>
  );
}

function nodeKindLabel(
  kind:
    KnowledgeGraphNode["kind"],
): string {
  if (kind === "domain") {
    return "GALAXIE";
  }

  if (kind === "topic") {
    return "PLANET";
  }

  if (kind === "subtopic") {
    return "STERN";
  }

  return "KONZEPT";
}

function nodeKindHeading(
  kind:
    KnowledgeGraphNode["kind"],
): string {
  if (kind === "domain") {
    return "Planeten";
  }

  if (kind === "topic") {
    return "Sterne";
  }

  if (kind === "subtopic") {
    return "Discoveries";
  }

  return "Discoveries";
}

function navigationDescription(
  kind:
    KnowledgeGraphNode["kind"],
): string {
  if (kind === "domain") {
    return "Öffne einen Planeten, um tiefer in diese Galaxie einzusteigen.";
  }

  if (kind === "topic") {
    return "Öffne einen Stern, um die zugehörigen Discoveries zu sehen.";
  }

  return "Die Discoveries bilden die Wissensbasis dieses Sterns.";
}

function collectDiscoveryIds(
  node: KnowledgeGraphNode,
  nodesById:
    Map<
      string,
      KnowledgeGraphNode
    >,
  visited =
    new Set<string>(),
): Set<string> {
  if (
    visited.has(node.id)
  ) {
    return new Set();
  }

  visited.add(node.id);

  const ids =
    new Set(
      node.discoveryIds,
    );

  for (
    const childId
    of node.childIds
  ) {
    const child =
      nodesById.get(
        childId,
      );

    if (!child) {
      continue;
    }

    for (
      const discoveryId
      of collectDiscoveryIds(
        child,
        nodesById,
        visited,
      )
    ) {
      ids.add(
        discoveryId,
      );
    }
  }

  return ids;
}

function countDiscoveries(
  node: KnowledgeGraphNode,
  nodesById:
    Map<
      string,
      KnowledgeGraphNode
    >,
): number {
  return collectDiscoveryIds(
    node,
    nodesById,
  ).size;
}
