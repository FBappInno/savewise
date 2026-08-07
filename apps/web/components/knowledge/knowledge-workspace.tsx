"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  KnowledgeLibrary,
} from "@savewise/shared";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

import {
  getKnowledgeLibrary,
} from "@/services/knowledge-client";

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

  const strongestInterests =
    useMemo(
      () =>
        [...(library?.interests ?? [])]
          .sort(
            (left, right) =>
              right.score - left.score,
          )
          .slice(0, 8),
      [library],
    );

  const strongestTopics =
    useMemo(
      () =>
        [...(library?.topics ?? [])]
          .sort(
            (left, right) =>
              right.discoveries -
              left.discoveries,
          )
          .slice(0, 15),
      [library],
    );

  return (
    <div className="knowledge-page">
      <section className="knowledge-hero">
        <div>
          <div className="knowledge-eyebrow">
            SAVEWISE · WISSEN
          </div>

          <h1>
            Deine Wissensbibliothek
          </h1>

          <p>
            Automatisch aus deinen
            gespeicherten Discoveries
            aufgebaut.
          </p>
        </div>

        <div className="knowledge-actions">
          <span className="workspace-pill">
            {activeWorkspaceId === "private"
              ? "Privat"
              : "Geschäftlich"}
          </span>

          <button
            className="refresh-button"
            disabled={isLoading}
            onClick={() => {
              void loadLibrary();
            }}
            type="button"
          >
            <span
              className={
                isLoading
                  ? "refresh-icon spinning"
                  : "refresh-icon"
              }
            >
              ↻
            </span>

            Aktualisieren
          </button>
        </div>
      </section>

      {error ? (
        <section className="error-card">
          <strong>
            Bibliothek konnte nicht geladen werden
          </strong>

          <p>{error}</p>

          <button
            onClick={() => {
              void loadLibrary();
            }}
            type="button"
          >
            Erneut versuchen
          </button>
        </section>
      ) : null}

      {isLoading && !library ? (
        <section className="loading-card">
          <div className="loader" />

          <div>
            <strong>
              Wissensbibliothek wird geladen
            </strong>

            <p>
              SaveWise lädt deine
              Wissensstruktur.
            </p>
          </div>
        </section>
      ) : null}

      {library ? (
        <>
          <section className="statistics-grid">
            <StatisticCard
              label="Discoveries"
              value={library.discoveries.length}
            />

            <StatisticCard
              label="Themen"
              value={library.topics.length}
            />

            <StatisticCard
              label="Verbindungen"
              value={library.relations.length}
            />

            <StatisticCard
              label="Interessen"
              value={library.interests.length}
            />
          </section>

          <section className="knowledge-section">
            <SectionHeading
              eyebrow="PERSÖNLICHES PROFIL"
              title="Deine stärksten Interessen"
              description="SaveWise erkennt wiederkehrende Themen in deinen gespeicherten Inhalten."
            />

            {strongestInterests.length > 0 ? (
              <div className="interest-grid">
                {strongestInterests.map(
                  (interest, index) => (
                    <InterestCard
                      key={interest.id}
                      rank={index + 1}
                      interest={interest}
                    />
                  ),
                )}
              </div>
            ) : (
              <EmptyState
                title="Noch keine stabilen Interessen"
                text="Mit weiteren Discoveries erkennt SaveWise automatisch deine wichtigsten Themen."
              />
            )}
          </section>

          <section className="knowledge-section">
            <SectionHeading
              eyebrow="WISSENSGEBIETE"
              title="Deine Themen"
              description="Die Themen, die aus deinen gespeicherten Discoveries entstanden sind."
            />

            {strongestTopics.length > 0 ? (
              <div className="topic-grid">
                {strongestTopics.map(
                  (topic) => (
                    <article
                      className="topic-card"
                      key={topic.id}
                    >
                      <div className="topic-header">
                        <div className="topic-icon">
                          ◇
                        </div>

                        <div className="topic-heading">
                          <strong>
                            {topic.name}
                          </strong>

                          <span>
                            {topic.discoveries}{" "}
                            {topic.discoveries === 1
                              ? "Discovery"
                              : "Discoveries"}
                          </span>
                        </div>

                        <div className="topic-count">
                          {topic.discoveries}
                        </div>
                      </div>

                      {topic.keywords.length > 0 ? (
                        <div className="keyword-list">
                          {topic.keywords
                            .slice(0, 5)
                            .map((keyword) => (
                              <span
                                className="keyword-chip"
                                key={`${topic.id}-${keyword}`}
                              >
                                {keyword}
                              </span>
                            ))}
                        </div>
                      ) : null}
                    </article>
                  ),
                )}
              </div>
            ) : (
              <EmptyState
                title="Noch keine Themen"
                text="Sobald Discoveries analysiert wurden, erscheinen hier deine Wissensgebiete."
              />
            )}
          </section>

          <section className="knowledge-section">
            <SectionHeading
              eyebrow="WISSENSSTRUKTUR"
              title="Dein Wissensnetz"
              description="SaveWise verbindet Discoveries, Themen und Interessen miteinander."
            />

            <div className="structure-grid">
              <StructureCard
                label="Wissensknoten"
                value={library.nodes.length}
              />

              <StructureCard
                label="Verbindungen"
                value={library.relations.length}
              />

              <StructureCard
                label="Insights"
                value={library.insights.length}
              />

              <StructureCard
                label="Graph"
                value={
                  library.graph
                    ? "Aktiv"
                    : "Noch leer"
                }
              />
            </div>
          </section>

          {library.generatedAt ? (
            <footer className="knowledge-footer">
              Wissensbibliothek zuletzt
              aktualisiert:{" "}
              {new Date(
                library.generatedAt,
              ).toLocaleString(
                "de-CH",
                {
                  dateStyle: "medium",
                  timeStyle: "short",
                },
              )}
            </footer>
          ) : null}
        </>
      ) : null}

      <style jsx>{`
        .knowledge-page {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 34px 40px 70px;
        }

        .knowledge-hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 32px;
          margin-bottom: 30px;
        }

        .knowledge-eyebrow {
          color: #4078ff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          margin-bottom: 9px;
        }

        .knowledge-hero h1 {
          margin: 0;
          color: #14213d;
          font-size: clamp(30px, 3vw, 44px);
          line-height: 1.08;
          letter-spacing: -0.035em;
        }

        .knowledge-hero p {
          max-width: 650px;
          color: #6f7890;
          font-size: 15px;
          line-height: 1.65;
          margin: 11px 0 0;
        }

        .knowledge-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .workspace-pill,
        .refresh-button {
          min-height: 40px;
          border: 1px solid #e0e6f0;
          border-radius: 12px;
          background: #ffffff;
          font-size: 12px;
          font-weight: 700;
        }

        .workspace-pill {
          display: inline-flex;
          align-items: center;
          padding: 0 14px;
          color: #69738a;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 15px;
          color: #315fd5;
          cursor: pointer;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .refresh-icon {
          font-size: 18px;
        }

        .statistics-grid,
        .structure-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .statistics-grid {
          margin-bottom: 42px;
        }

        .knowledge-section {
          margin-top: 46px;
        }

        .interest-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .topic-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .topic-card {
          min-height: 130px;
          background: #ffffff;
          border: 1px solid #e5e9f2;
          border-radius: 17px;
          padding: 17px;
        }

        .topic-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .topic-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #f1f5ff;
          color: #4078ff;
        }

        .topic-heading {
          min-width: 0;
          flex: 1;
        }

        .topic-heading strong,
        .topic-heading span {
          display: block;
        }

        .topic-heading strong {
          color: #27334e;
          font-size: 13px;
        }

        .topic-heading span {
          color: #8790a4;
          font-size: 10px;
          margin-top: 4px;
        }

        .topic-count {
          color: #4078ff;
          font-size: 19px;
          font-weight: 850;
        }

        .keyword-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 15px;
        }

        .keyword-chip {
          border-radius: 999px;
          background: #f4f6fa;
          color: #70798c;
          padding: 5px 8px;
          font-size: 9px;
          font-weight: 650;
        }

        .loading-card,
        .error-card {
          margin-bottom: 28px;
          padding: 24px;
          border: 1px solid #e5e9f2;
          border-radius: 18px;
          background: #ffffff;
        }

        .loading-card {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .loading-card p,
        .error-card p {
          margin: 5px 0 0;
          color: #7c869b;
          font-size: 12px;
        }

        .loader {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 3px solid #e6ecfa;
          border-top-color: #4078ff;
          animation: spin 0.8s linear infinite;
        }

        .error-card button {
          margin-top: 14px;
          padding: 9px 13px;
          border: 0;
          border-radius: 10px;
          background: #233968;
          color: #ffffff;
          font-weight: 700;
          cursor: pointer;
        }

        .knowledge-footer {
          margin-top: 44px;
          padding-top: 18px;
          border-top: 1px solid #eceff5;
          color: #969dae;
          font-size: 11px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @media (max-width: 1100px) {
          .statistics-grid,
          .structure-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .topic-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }

        @media (max-width: 760px) {
          .knowledge-page {
            padding: 24px 18px 60px;
          }

          .knowledge-hero {
            flex-direction: column;
          }

          .interest-grid,
          .topic-grid,
          .statistics-grid,
          .structure-grid {
            grid-template-columns: 1fr;
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
          min-height: 116px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 18px 20px;
          background: #ffffff;
          border: 1px solid #e5e9f2;
          border-radius: 18px;
        }

        strong {
          color: #2e63e5;
          font-size: 30px;
          letter-spacing: -0.035em;
        }

        span {
          margin-top: 5px;
          color: #818a9d;
          font-size: 11px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

function StructureCard({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="structure-card">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .structure-card {
          padding: 18px;
          border: 1px solid #e5e9f2;
          border-radius: 16px;
          background: #ffffff;
        }

        span {
          display: block;
          color: #8b93a5;
          font-size: 10px;
          margin-bottom: 7px;
        }

        strong {
          color: #293650;
          font-size: 17px;
        }
      `}</style>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>

      <style jsx>{`
        span {
          color: #4078ff;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.13em;
        }

        h2 {
          margin: 6px 0 4px;
          color: #26324d;
          font-size: 21px;
          letter-spacing: -0.02em;
        }

        p {
          margin: 0;
          color: #8a92a4;
          font-size: 12px;
          line-height: 1.55;
        }
      `}</style>
    </div>
  );
}

function InterestCard({
  interest,
  rank,
}: {
  interest: {
    id: string;
    name: string;
    score: number;
    discoveries: number;
  };
  rank: number;
}) {
  const percentage =
    Math.round(
      Math.max(
        0,
        Math.min(
          interest.score,
          1,
        ),
      ) * 100,
    );

  return (
    <div className="interest-card">
      <div className="interest-top">
        <span>#{rank}</span>

        <strong>
          {interest.name}
        </strong>

        <b>
          {interest.discoveries}
        </b>
      </div>

      <div className="strength-track">
        <div
          className="strength-fill"
          style={{
            width: `${Math.max(
              4,
              percentage,
            )}%`,
          }}
        />
      </div>

      <div className="interest-meta">
        <span>
          Interessenstärke
        </span>

        <strong>
          {percentage} %
        </strong>
      </div>

      <style jsx>{`
        .interest-card {
          padding: 17px 18px;
          border: 1px solid #e5e9f2;
          border-radius: 17px;
          background: #ffffff;
        }

        .interest-top {
          display: grid;
          grid-template-columns:
            40px 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .interest-top span {
          color: #4078ff;
          font-size: 11px;
          font-weight: 850;
        }

        .interest-top strong {
          color: #26324d;
          font-size: 13px;
        }

        .interest-top b {
          color: #4078ff;
          font-size: 18px;
        }

        .strength-track {
          height: 5px;
          margin-top: 15px;
          overflow: hidden;
          border-radius: 999px;
          background: #edf0f6;
        }

        .strength-fill {
          height: 100%;
          border-radius: 999px;
          background: #4c7df0;
        }

        .interest-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          color: #9299a9;
          font-size: 10px;
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
      <div>◇</div>

      <section>
        <strong>{title}</strong>
        <p>{text}</p>
      </section>

      <style jsx>{`
        .empty-state {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 18px;
          padding: 20px;
          border: 1px dashed #dce2ee;
          border-radius: 16px;
          background: rgba(
            255,
            255,
            255,
            0.55
          );
        }

        .empty-state > div {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #4078ff;
          background: #f0f5ff;
        }

        strong {
          color: #33405c;
          font-size: 12px;
        }

        p {
          margin: 4px 0 0;
          color: #8d95a6;
          font-size: 11px;
          line-height: 1.55;
        }
      `}</style>
    </div>
  );
}
