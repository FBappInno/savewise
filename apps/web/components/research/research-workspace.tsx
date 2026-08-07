"use client";

import type {
  ResearchCandidate,
  ResearchImpact,
  ResearchInsight,
  ResearchSourceType,
  ResearchState,
} from "@savewise/shared";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getResearchState,
  runResearch,
  saveResearchCandidate,
  updateResearchCandidate,
} from "@/services/research-client";

type ResearchFilter =
  | "all"
  | "knowledge-gap"
  | "trend"
  | "startup"
  | "paper";

export function ResearchWorkspace() {
  const [
    research,
    setResearch,
  ] =
    useState<ResearchState | null>(
      null,
    );

  const [
    isLoading,
    setLoading,
  ] =
    useState(true);

  const [
    isResearching,
    setResearching,
  ] =
    useState(false);

  const [
    activeCandidateId,
    setActiveCandidateId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    filter,
    setFilter,
  ] =
    useState<ResearchFilter>(
      "all",
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          setResearch(
            await getResearchState(),
          );
        } catch (loadError) {
          setError(
            getErrorMessage(
              loadError,
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const suggestedCandidates =
    useMemo(
      () =>
        research?.candidates.filter(
          (candidate) =>
            candidate.status ===
            "suggested",
        ) ?? [],
      [research],
    );

  const visibleCandidates =
    useMemo(
      () =>
        suggestedCandidates.filter(
          (candidate) => {
            if (filter === "all") {
              return true;
            }

            if (
              filter ===
              "startup"
            ) {
              return (
                candidate.sourceType ===
                  "startup" ||
                candidate.sourceType ===
                  "company"
              );
            }

            if (
              filter ===
              "paper"
            ) {
              return (
                candidate.sourceType ===
                  "paper" ||
                candidate.sourceType ===
                  "study" ||
                candidate.sourceType ===
                  "whitepaper"
              );
            }

            const candidateInsights =
              research?.insights.filter(
                (insight) =>
                  insight.candidateIds.includes(
                    candidate.id,
                  ),
              ) ?? [];

            return candidateInsights.some(
              (insight) =>
                insight.kind ===
                filter,
            );
          },
        ),
      [
        filter,
        research,
        suggestedCandidates,
      ],
    );

  const latestInsights =
    useMemo(
      () =>
        [...(research?.insights ?? [])]
          .sort(
            (left, right) =>
              new Date(
                right.createdAt,
              ).getTime() -
              new Date(
                left.createdAt,
              ).getTime(),
          )
          .slice(0, 6),
      [research],
    );

  const knowledgeGaps =
    useMemo(
      () =>
        Array.from(
          new Set(
            research?.interests.flatMap(
              (interest) =>
                interest.knowledgeGaps.map(
                  (gap) =>
                    `${interest.title}: ${gap}`,
                ),
            ) ?? [],
          ),
        ),
      [research],
    );

  async function handleRun() {
    setResearching(true);
    setError(null);

    try {
      setResearch(
        await runResearch(),
      );
    } catch (runError) {
      setError(
        getErrorMessage(
          runError,
        ),
      );
    } finally {
      setResearching(false);
    }
  }

  async function handleDismiss(
    candidateId: string,
  ) {
    setActiveCandidateId(
      candidateId,
    );

    setError(null);

    try {
      setResearch(
        await updateResearchCandidate(
          candidateId,
          "dismissed",
        ),
      );
    } catch (candidateError) {
      setError(
        getErrorMessage(
          candidateError,
        ),
      );
    } finally {
      setActiveCandidateId(
        null,
      );
    }
  }

  async function handleSave(
    candidateId: string,
  ) {
    setActiveCandidateId(
      candidateId,
    );

    setError(null);

    try {
      setResearch(
        await saveResearchCandidate(
          candidateId,
        ),
      );
    } catch (candidateError) {
      setError(
        getErrorMessage(
          candidateError,
        ),
      );
    } finally {
      setActiveCandidateId(
        null,
      );
    }
  }

  const latestBriefing =
    research?.briefings?.[0] ??
    null;

  return (
    <div className="research-page">
      <header className="hero">
        <div>
          <div className="eyebrow">
            SAVEWISE · RESEARCH
          </div>

          <h1>
            Autonome Recherche
          </h1>

          <p>
            SaveWise sucht neues Wissen
            passend zu deinen Galaxien,
            Topics, Unterthemen und
            erkannten Wissenslücken.
          </p>
        </div>

        <div
          className={
            isResearching
              ? "status running"
              : "status"
          }
        >
          <span className="status-dot" />

          {isResearching
            ? "MISSION LÄUFT"
            : "READY"}
        </div>
      </header>

      <section className="mission-card">
        <div>
          <div className="section-eyebrow">
            RESEARCH MISSION
          </div>

          <h2>
            Neue Research-Mission starten
          </h2>

          <p>
            Die KI analysiert deine
            bestehenden Interessen,
            Wissenslücken und den
            Knowledge Graph und sucht
            passende externe Quellen.
          </p>
        </div>

        <button
          className="run-button"
          disabled={isResearching}
          onClick={() => {
            void handleRun();
          }}
          type="button"
        >
          {isResearching
            ? "✦ Research läuft …"
            : "⌁ Research starten"}
        </button>
      </section>

      {error ? (
        <div className="error-card">
          {error}
        </div>
      ) : null}

      {isLoading && !research ? (
        <div className="loading-card">
          Research wird geladen …
        </div>
      ) : null}

      {research ? (
        <>
          <section className="statistics-grid">
            <StatisticCard
              label="Kandidaten"
              value={
                suggestedCandidates.length
              }
            />

            <StatisticCard
              label="Research-Interessen"
              value={
                research.interests.length
              }
            />

            <StatisticCard
              label="Insights"
              value={
                research.insights.length
              }
            />

            <StatisticCard
              label="Wissenslücken"
              value={
                knowledgeGaps.length
              }
            />
          </section>

          {latestBriefing ? (
            <section className="section">
              <SectionHeading
                eyebrow="BRIEFING"
                title={
                  latestBriefing.title
                }
                description={
                  latestBriefing.summary
                }
              />

              <div className="briefing-grid">
                <BriefingMetric
                  label="Gefunden"
                  value={
                    latestBriefing
                      .counts
                      .totalFound
                  }
                />

                <BriefingMetric
                  label="Papers"
                  value={
                    latestBriefing
                      .counts.papers
                  }
                />

                <BriefingMetric
                  label="Startups"
                  value={
                    latestBriefing
                      .counts.startups
                  }
                />

                <BriefingMetric
                  label="Trends"
                  value={
                    latestBriefing
                      .counts.trends
                  }
                />

                <BriefingMetric
                  label="Wissenslücken"
                  value={
                    latestBriefing
                      .counts
                      .knowledgeGaps
                  }
                />
              </div>
            </section>
          ) : null}

          <section className="section">
            <SectionHeading
              eyebrow="RESEARCH RADAR"
              title="Neue Wissenskandidaten"
              description="Bewertete externe Inhalte, die dein bestehendes Wissen bestätigen, erweitern oder infrage stellen."
            />

            <div className="filter-row">
              <FilterButton
                active={
                  filter === "all"
                }
                label="Alle"
                onClick={() =>
                  setFilter("all")
                }
              />

              <FilterButton
                active={
                  filter ===
                  "knowledge-gap"
                }
                label="Wissenslücken"
                onClick={() =>
                  setFilter(
                    "knowledge-gap",
                  )
                }
              />

              <FilterButton
                active={
                  filter ===
                  "trend"
                }
                label="Trends"
                onClick={() =>
                  setFilter("trend")
                }
              />

              <FilterButton
                active={
                  filter ===
                  "startup"
                }
                label="Startups"
                onClick={() =>
                  setFilter(
                    "startup",
                  )
                }
              />

              <FilterButton
                active={
                  filter ===
                  "paper"
                }
                label="Studien & Papers"
                onClick={() =>
                  setFilter("paper")
                }
              />
            </div>

            {visibleCandidates.length >
            0 ? (
              <div className="candidate-grid">
                {visibleCandidates.map(
                  (candidate) => (
                    <CandidateCard
                      candidate={
                        candidate
                      }
                      isBusy={
                        activeCandidateId ===
                        candidate.id
                      }
                      key={
                        candidate.id
                      }
                      onDismiss={
                        handleDismiss
                      }
                      onSave={
                        handleSave
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <EmptyState
                title="Keine offenen Kandidaten"
                text="Starte eine neue Research-Mission oder wähle einen anderen Filter."
              />
            )}
          </section>

          <section className="section">
            <SectionHeading
              eyebrow="KI-INSIGHTS"
              title="Was Research erkannt hat"
              description="Neue Erkenntnisse werden mit deinem bestehenden SaveWise-Wissen verglichen."
            />

            {latestInsights.length >
            0 ? (
              <div className="insight-grid">
                {latestInsights.map(
                  (insight) => (
                    <InsightCard
                      insight={insight}
                      key={insight.id}
                    />
                  ),
                )}
              </div>
            ) : (
              <EmptyState
                title="Noch keine Research-Insights"
                text="Nach einer Research-Mission erscheinen hier Bestätigungen, Widersprüche, Trends und Wissenslücken."
              />
            )}
          </section>

          <section className="section">
            <SectionHeading
              eyebrow="WISSENSLÜCKEN"
              title="Was SaveWise noch nicht ausreichend weiß"
              description="Diese Bereiche können später gezielt neue Research-Missionen auslösen."
            />

            {knowledgeGaps.length >
            0 ? (
              <div className="gap-grid">
                {knowledgeGaps
                  .slice(0, 12)
                  .map((gap) => (
                    <div
                      className="gap-card"
                      key={gap}
                    >
                      <span>◇</span>

                      <p>{gap}</p>
                    </div>
                  ))}
              </div>
            ) : (
              <EmptyState
                title="Keine stabilen Wissenslücken erkannt"
                text="Mit wachsendem Wissen erkennt SaveWise automatisch schwach belegte Bereiche."
              />
            )}
          </section>

          <section className="knowledge-flow">
            <div className="section-eyebrow">
              SAVEWISE KNOWLEDGE FLOW
            </div>

            <h2>
              Research erweitert dein
              Wissensuniversum
            </h2>

            <div className="flow">
              <span>Research</span>
              <b>→</b>
              <span>Prüfen</span>
              <b>→</b>
              <span>Speichern</span>
              <b>→</b>
              <span>Galaxie</span>
              <b>→</b>
              <span>Topic</span>
              <b>→</b>
              <span>Unterthema</span>
              <b>→</b>
              <span>Discovery</span>
            </div>
          </section>
        </>
      ) : null}

      <style jsx>{`
        .research-page {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
          padding: 36px 42px 80px;
        }

        .hero {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 32px;
        }

        .eyebrow,
        .section-eyebrow {
          color: #658cff;
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
          color: #edf3fc;
          font-size: clamp(
            32px,
            3vw,
            45px
          );
          letter-spacing: -0.035em;
        }

        .hero p {
          max-width: 760px;
          margin: 12px 0 0;
          color: #aab6ca;
          font-size: 16px;
          line-height: 1.65;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid
            rgba(
              79,
              209,
              147,
              0.2
            );
          border-radius: 12px;
          background: rgba(
            79,
            209,
            147,
            0.07
          );
          color: #79dba7;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.08em;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #57d392;
        }

        .running .status-dot {
          animation: pulse 1s
            ease-in-out infinite;
        }

        .mission-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
          padding: 28px;
          border: 1px solid
            rgba(
              99,
              135,
              255,
              0.22
            );
          border-radius: 22px;
          background: rgba(
            61,
            91,
            180,
            0.09
          );
          margin-bottom: 24px;
        }

        .mission-card h2,
        .knowledge-flow h2 {
          margin: 0;
          color: #edf3fc;
          font-size: 26px;
        }

        .mission-card p {
          max-width: 780px;
          color: #aab6ca;
          font-size: 14px;
          line-height: 1.65;
          margin: 8px 0 0;
        }

        .run-button {
          flex-shrink: 0;
          min-height: 48px;
          padding: 0 20px;
          border: 0;
          border-radius: 13px;
          background: #79a8ff;
          color: #071629;
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
        }

        .run-button:disabled {
          opacity: 0.55;
          cursor: default;
        }

        .statistics-grid {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 14px;
          margin-top: 28px;
        }

        .section {
          margin-top: 54px;
        }

        .briefing-grid {
          display: grid;
          grid-template-columns:
            repeat(
              5,
              minmax(0, 1fr)
            );
          gap: 12px;
          margin-top: 20px;
        }

        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
          margin-top: 22px;
        }

        .candidate-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 17px;
          margin-top: 22px;
        }

        .insight-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 14px;
          margin-top: 20px;
        }

        .gap-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 12px;
          margin-top: 20px;
        }

        .gap-card {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 17px;
          border: 1px solid
            rgba(
              224,
              165,
              63,
              0.2
            );
          border-radius: 15px;
          background: rgba(
            224,
            165,
            63,
            0.06
          );
        }

        .gap-card span {
          color: #efc26b;
          font-size: 18px;
        }

        .gap-card p {
          margin: 0;
          color: #c8bd9f;
          font-size: 14px;
          line-height: 1.55;
        }

        .knowledge-flow {
          margin-top: 60px;
          padding: 28px;
          border-radius: 20px;
          background: rgba(
            255,
            255,
            255,
            0.035
          );
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.09
            );
        }

        .flow {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-top: 21px;
        }

        .flow span {
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(
            100,
            139,
            255,
            0.1
          );
          color: #cbd8ff;
          font-size: 13px;
          font-weight: 700;
        }

        .flow b {
          color: #687691;
        }

        .loading-card,
        .error-card {
          padding: 18px 20px;
          border-radius: 14px;
          background: rgba(
            255,
            255,
            255,
            0.05
          );
          color: #dbe4f2;
          margin: 18px 0;
          font-size: 14px;
        }

        .error-card {
          color: #f0aaaa;
        }

        @keyframes pulse {
          50% {
            opacity: 0.3;
          }
        }

        @media (
          max-width: 1100px
        ) {
          .statistics-grid,
          .briefing-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

          .candidate-grid {
            grid-template-columns:
              1fr;
          }
        }

        @media (
          max-width: 760px
        ) {
          .research-page {
            padding:
              26px 18px 60px;
          }

          .hero,
          .mission-card {
            flex-direction: column;
            align-items: stretch;
          }

          .statistics-grid,
          .briefing-grid,
          .insight-grid,
          .gap-grid {
            grid-template-columns:
              1fr;
          }
        }
      `}</style>
    </div>
  );
}

function CandidateCard({
  candidate,
  isBusy,
  onDismiss,
  onSave,
}: {
  candidate:
    ResearchCandidate;
  isBusy:
    boolean;
  onDismiss:
    (candidateId: string) =>
      Promise<void>;
  onSave:
    (candidateId: string) =>
      Promise<void>;
}) {
  const match =
    Math.round(
      candidate.scores.overall *
        100,
    );

  return (
    <article className="candidate">
      <div className="candidate-header">
        <span className="source-badge">
          {sourceLabel(
            candidate.sourceType,
          )}
        </span>

        <div className="match">
          <strong>
            {match} %
          </strong>

          <span>MATCH</span>
        </div>
      </div>

      <h3>
        {candidate.title}
      </h3>

      <div className="source">
        {candidate.sourceName}
      </div>

      <p className="summary">
        {candidate.summary}
      </p>

      <div className="scores">
        <Score
          label="Relevanz"
          value={
            candidate.scores
              .relevance
          }
        />

        <Score
          label="Qualität"
          value={
            candidate.scores
              .quality
          }
        />

        <Score
          label="Vertrauen"
          value={
            candidate.scores
              .trustworthiness
          }
        />

        <Score
          label="Wissenswert"
          value={
            candidate.scores
              .knowledgeValue
          }
        />

        <Score
          label="Aktualität"
          value={
            candidate.scores
              .recency
          }
        />

        <Score
          label="Wissenslücke"
          value={
            candidate.scores
              .gapCoverage
          }
        />
      </div>

      <div className="impact">
        <span>
          KNOWLEDGE IMPACT
        </span>

        <strong>
          {impactLabel(
            candidate.impact,
          )}
        </strong>

        <p>
          {
            candidate.impactExplanation
          }
        </p>
      </div>

      <div className="reason">
        ✦{" "}
        {candidate.decisionReason}
      </div>

      <div className="actions">
        <button
          disabled={isBusy}
          onClick={() => {
            void onDismiss(
              candidate.id,
            );
          }}
          type="button"
        >
          Verwerfen
        </button>

        <button
          className="save"
          disabled={isBusy}
          onClick={() => {
            void onSave(
              candidate.id,
            );
          }}
          type="button"
        >
          {isBusy
            ? "Speichert …"
            : "In Wissen speichern"}
        </button>
      </div>

      <style jsx>{`
        .candidate {
          padding: 23px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.11
            );
          border-radius: 20px;
          background: rgba(
            255,
            255,
            255,
            0.045
          );
        }

        .candidate-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
        }

        .source-badge {
          padding: 6px 9px;
          border-radius: 9px;
          background: rgba(
            98,
            137,
            255,
            0.12
          );
          color: #88a8ff;
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
        }

        .match {
          text-align: right;
        }

        .match strong,
        .match span {
          display: block;
        }

        .match strong {
          color: #7ba4ff;
          font-size: 20px;
        }

        .match span {
          color: #7d899f;
          font-size: 9px;
          letter-spacing: 0.1em;
        }

        h3 {
          color: #eff4fc;
          font-size: 19px;
          line-height: 1.4;
          margin: 16px 0 6px;
        }

        .source {
          color: #8190a9;
          font-size: 12px;
        }

        .summary {
          color: #adb8ca;
          font-size: 14px;
          line-height: 1.65;
          margin: 14px 0;
        }

        .scores {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 8px;
          margin-top: 18px;
        }

        .impact {
          margin-top: 18px;
          padding: 15px;
          border-radius: 14px;
          border: 1px solid
            rgba(
              112,
              146,
              255,
              0.2
            );
          background: rgba(
            82,
            110,
            198,
            0.08
          );
        }

        .impact > span {
          color: #788bb4;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.11em;
        }

        .impact strong {
          display: block;
          color: #dfe8f7;
          font-size: 14px;
          margin-top: 5px;
        }

        .impact p {
          color: #99a6ba;
          font-size: 12px;
          line-height: 1.55;
          margin: 5px 0 0;
        }

        .reason {
          margin-top: 13px;
          color: #b3a7e7;
          font-size: 12px;
          line-height: 1.5;
        }

        .actions {
          display: grid;
          grid-template-columns:
            1fr 1.35fr;
          gap: 9px;
          margin-top: 18px;
        }

        .actions button {
          min-height: 42px;
          border-radius: 11px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.12
            );
          background: rgba(
            255,
            255,
            255,
            0.04
          );
          color: #b8c3d5;
          font-weight: 750;
          cursor: pointer;
        }

        .actions .save {
          border: 0;
          background: #79a8ff;
          color: #061628;
        }

        .actions button:disabled {
          opacity: 0.5;
        }

        @media (
          max-width: 600px
        ) {
          .scores {
            grid-template-columns:
              repeat(2, 1fr);
          }
        }
      `}</style>
    </article>
  );
}

function Score({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="score">
      <strong>
        {Math.round(
          value * 100,
        )}
        %
      </strong>

      <span>
        {label}
      </span>

      <style jsx>{`
        .score {
          padding: 10px;
          border-radius: 10px;
          background: rgba(
            255,
            255,
            255,
            0.035
          );
        }

        strong {
          display: block;
          color: #dbe4f4;
          font-size: 13px;
        }

        span {
          display: block;
          color: #738097;
          font-size: 9px;
          margin-top: 3px;
        }
      `}</style>
    </div>
  );
}

function StatisticCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="statistic">
      <strong>{value}</strong>
      <span>{label}</span>

      <style jsx>{`
        .statistic {
          min-height: 110px;
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
          font-size: 30px;
        }

        span {
          color: #aab5c8;
          font-size: 13px;
          margin-top: 5px;
        }
      `}</style>
    </div>
  );
}

function BriefingMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>

      <style jsx>{`
        .metric {
          padding: 15px;
          border-radius: 14px;
          background: rgba(
            255,
            255,
            255,
            0.035
          );
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.08
            );
        }

        strong {
          display: block;
          color: #dfe8f8;
          font-size: 19px;
        }

        span {
          color: #8390a5;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}

function InsightCard({
  insight,
}: {
  insight: ResearchInsight;
}) {
  return (
    <article className="insight">
      <span>
        {insightKindLabel(
          insight.kind,
        )}
      </span>

      <h3>
        {insight.title}
      </h3>

      <p>
        {insight.description}
      </p>

      <style jsx>{`
        .insight {
          padding: 19px;
          border-radius: 16px;
          background: rgba(
            255,
            255,
            255,
            0.04
          );
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.09
            );
        }

        span {
          color: #7e9fff;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.1em;
        }

        h3 {
          color: #e6edf8;
          font-size: 16px;
          margin: 7px 0;
        }

        p {
          color: #9ca9bc;
          font-size: 13px;
          line-height: 1.6;
          margin: 0;
        }
      `}</style>
    </article>
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
    <div>
      <div className="eyebrow">
        {eyebrow}
      </div>

      <h2>{title}</h2>
      <p>{description}</p>

      <style jsx>{`
        .eyebrow {
          color: #658cff;
          font-size: 13px;
          font-weight: 850;
          letter-spacing: 0.13em;
        }

        h2 {
          margin: 7px 0 5px;
          color: #e9eef8;
          font-size: 28px;
          letter-spacing: -0.025em;
        }

        p {
          max-width: 820px;
          margin: 0;
          color: #aeb9cc;
          font-size: 15px;
          line-height: 1.65;
        }
      `}</style>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "filter active"
          : "filter"
      }
      onClick={onClick}
      type="button"
    >
      {label}

      <style jsx>{`
        .filter {
          min-height: 37px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid
            rgba(
              255,
              255,
              255,
              0.1
            );
          background: rgba(
            255,
            255,
            255,
            0.035
          );
          color: #9eabbf;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .active {
          border-color: rgba(
            97,
            139,
            255,
            0.45
          );
          background: rgba(
            79,
            119,
            224,
            0.15
          );
          color: #cbd8ff;
        }
      `}</style>
    </button>
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
    <div className="empty">
      <strong>{title}</strong>
      <p>{text}</p>

      <style jsx>{`
        .empty {
          margin-top: 20px;
          padding: 22px;
          border-radius: 15px;
          border: 1px dashed
            rgba(
              255,
              255,
              255,
              0.14
            );
        }

        strong {
          color: #dfe7f4;
          font-size: 15px;
        }

        p {
          color: #929fb3;
          font-size: 13px;
          margin: 6px 0 0;
        }
      `}</style>
    </div>
  );
}

function sourceLabel(
  source:
    ResearchSourceType,
): string {
  const labels:
    Record<
      ResearchSourceType,
      string
    > = {
      study: "Studie",
      paper: "Paper",
      video: "Video",
      podcast: "Podcast",
      news: "News",
      github: "GitHub",
      startup: "Startup",
      company: "Unternehmen",
      product: "Produkt",
      technology: "Technologie",
      whitepaper: "Whitepaper",
      documentation:
        "Dokumentation",
      article: "Artikel",
      other: "Quelle",
    };

  return labels[source];
}

function impactLabel(
  impact:
    ResearchImpact,
): string {
  const labels:
    Record<
      ResearchImpact,
      string
    > = {
      confirms:
        "Bestätigt dein Wissen",
      contradicts:
        "Widerspricht bestehendem Wissen",
      extends:
        "Erweitert dein Wissen",
      "new-perspective":
        "Neue Perspektive",
    };

  return labels[impact];
}

function insightKindLabel(
  kind:
    ResearchInsight["kind"],
): string {
  if (
    kind === "knowledge-gap"
  ) {
    return "WISSENSLÜCKE";
  }

  if (
    kind === "confirmation"
  ) {
    return "BESTÄTIGUNG";
  }

  if (
    kind ===
    "contradiction"
  ) {
    return "WIDERSPRUCH";
  }

  return "TREND";
}

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Der Research Agent ist momentan nicht verfügbar.";
}
