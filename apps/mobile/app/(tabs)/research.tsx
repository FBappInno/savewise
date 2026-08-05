import { Ionicons } from "@expo/vector-icons";

import {
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import type {
  ResearchCandidate,
  ResearchInsight,
  ResearchSourceType,
} from "@savewise/shared";

import { ResearchCandidateCard } from "@/components/research/research-candidate-card";
import { StarBackground } from "@/components/universe-ui/star-background";
import { useResearchAgent } from "@/hooks/use-research-agent";
import { useAppSettings } from "@/providers/app-settings-provider";
import { universeTheme } from "@/theme/universe-theme";

type BriefingFilter =
  | "all"
  | "science"
  | "videos"
  | "startups"
  | "trends"
  | "knowledge-gaps";

export default function ResearchScreen() {
  const {
    settings,
    t,
  } = useAppSettings();

  const scrollViewRef =
    useRef<ScrollView>(null);

  const detailPosition =
    useRef(0);

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState<BriefingFilter | null>(
      null,
    );

  const {
    research,
    isLoading,
    isResearching,
    activeCandidateId,
    error,
    run,
    dismiss,
    save,
  } = useResearchAgent();

  const briefing =
    research?.briefings?.[0] ??
    null;

  const suggestedCandidates =
    useMemo(
      () =>
        research?.candidates.filter(
          (candidate) =>
            candidate.status ===
            "suggested",
        ) ?? [],
      [research?.candidates],
    );

  const latestInsights =
    useMemo(
      () =>
        research?.insights
          ?.slice()
          .sort(
            (first, second) =>
              new Date(
                second.createdAt,
              ).getTime() -
              new Date(
                first.createdAt,
              ).getTime(),
          )
          .slice(0, 5) ?? [],
      [research?.insights],
    );

  const selectedInsights =
    useMemo(
      () =>
        getFilteredInsights(
          research?.insights ?? [],
          activeFilter,
        ),
      [
        activeFilter,
        research?.insights,
      ],
    );

  const filteredCandidates =
    useMemo(
      () =>
        getFilteredCandidates({
          activeFilter,

          candidates:
            suggestedCandidates,

          briefingCandidateIds:
            briefing?.candidateIds ??
            [],

          insights:
            research?.insights ?? [],
        }),
      [
        activeFilter,
        briefing?.candidateIds,
        research?.insights,
        suggestedCandidates,
      ],
    );

  const knowledgeGaps =
    useMemo(
      () =>
        uniqueStrings(
          research?.interests.flatMap(
            (interest) =>
              interest.knowledgeGaps.map(
                (gap) =>
                  `${interest.title}: ${gap}`,
              ),
          ) ?? [],
        ),
      [research?.interests],
    );

  const visibleCandidates =
    activeFilter
      ? filteredCandidates
      : suggestedCandidates;

  function saveDetailPosition(
    event: LayoutChangeEvent,
  ) {
    detailPosition.current =
      event.nativeEvent.layout.y;
  }

  function selectFilter(
    filter: BriefingFilter,
  ) {
    const nextFilter =
      activeFilter === filter
        ? null
        : filter;

    setActiveFilter(nextFilter);

    if (nextFilter) {
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo(
          {
            animated: true,

            y: Math.max(
              0,
              detailPosition.current -
                24,
            ),
          },
        );
      });
    }
  }

  return (
    <View style={styles.screen}>
      <StarBackground density={105} />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        ref={scrollViewRef}
        refreshControl={
          <RefreshControl
            refreshing={isResearching}
            tintColor={
              universeTheme.colors
                .primaryBright
            }
            onRefresh={() => {
              if (
                settings.ai
                  .autonomousResearch
              ) {
                void run();
              }
            }}
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View
              style={styles.scoutIcon}
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="telescope"
                size={25}
              />
            </View>

            <View style={styles.flex}>
              <Text style={styles.eyebrow}>
                AUTONOMOUS INTELLIGENCE
              </Text>

              <Text style={styles.title}>
                SaveWise Scout
              </Text>
            </View>

            <View style={styles.statusBadge}>
              <View
                style={styles.statusDot}
              />

              <Text
                style={
                  styles.statusText
                }
              >
                ONLINE
              </Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            Scout durchsucht neue
            Quellen, erkennt Trends und
            ergänzt dein Wissen
            selbstständig.
          </Text>
        </View>

        <View style={styles.missionCard}>
          <View
            style={
              styles.missionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                RESEARCH MISSION
              </Text>

              <Text
                style={
                  styles.missionTitle
                }
              >
                Autonome Recherche
              </Text>
            </View>

            <View
              style={
                styles.missionStatus
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .green
                }
                name="pulse-outline"
                size={16}
              />

              <Text
                style={
                  styles.missionStatusText
                }
              >
                READY
              </Text>
            </View>
          </View>

          <Text
            style={
              styles.missionText
            }
          >
            Starte eine neue Mission.
            SaveWise analysiert deine
            Interessen, Wissenslücken und
            relevante externe Quellen.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={
              isResearching ||
              !settings.ai
                .autonomousResearch
            }
            onPress={() => {
              void run();
            }}
            style={({ pressed }) => [
              styles.runButton,

              pressed &&
                styles.pressed,

              (!settings.ai
                .autonomousResearch ||
                isResearching) &&
                styles.disabled,
            ]}
          >
            {isResearching ? (
              <>
                <ActivityIndicator
                  color="#03111E"
                />

                <Text
                  style={
                    styles.runButtonText
                  }
                >
                  Mission läuft …
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  color="#03111E"
                  name="telescope"
                  size={20}
                />

                <Text
                  style={
                    styles.runButtonText
                  }
                >
                  {t("research.run")}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {!settings.ai
          .autonomousResearch ? (
          <MessageCard
            icon="pause-circle-outline"
            message={t(
              "research.disabled",
            )}
            title="Scout deaktiviert"
            tone="warning"
          />
        ) : null}

        {error ? (
          <MessageCard
            icon="alert-circle-outline"
            message={error}
            title="Recherchefehler"
            tone="error"
          />
        ) : null}

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator
              color={
                universeTheme.colors
                  .primaryBright
              }
              size="large"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Scout lädt den aktuellen
              Forschungsstand …
            </Text>
          </View>
        ) : null}

        {briefing ? (
          <View style={styles.section}>
            <View
              style={
                styles.sectionHeading
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionEyebrow
                  }
                >
                  TODAY&apos;S INTELLIGENCE
                </Text>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  {t(
                    "research.dailyBriefing",
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.briefingSignal
                }
              >
                <View
                  style={
                    styles.signalDot
                  }
                />

                <Text
                  style={
                    styles.signalText
                  }
                >
                  LIVE
                </Text>
              </View>
            </View>

            <View
              style={
                styles.briefingCard
              }
            >
              <View
                style={
                  styles.briefingTopGlow
                }
              />

              <View
                style={
                  styles.briefingHeader
                }
              >
                <View
                  style={
                    styles.briefingIcon
                  }
                >
                  <Ionicons
                    color={
                      universeTheme.colors
                        .yellow
                    }
                    name="sunny-outline"
                    size={22}
                  />
                </View>

                <View style={styles.flex}>
                  <Text
                    style={
                      styles.briefingTitle
                    }
                  >
                    {briefing.title}
                  </Text>

                  <Text
                    style={
                      styles.briefingDate
                    }
                  >
                    {briefing.date}
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.briefingSummary
                }
              >
                {briefing.summary}
              </Text>

              <Text
                style={
                  styles.metricHint
                }
              >
                Tippe auf ein Signal, um
                die zugehörigen
                Vorschläge anzuzeigen.
              </Text>

              <View
                style={
                  styles.metricsGrid
                }
              >
                <InteractiveMetric
                  active={
                    activeFilter ===
                    "all"
                  }
                  icon="search-outline"
                  label={t(
                    "research.found",
                  )}
                  onPress={() =>
                    selectFilter("all")
                  }
                  value={
                    briefing.counts
                      .totalFound
                  }
                />

                <InteractiveMetric
                  active={
                    activeFilter ===
                    "science"
                  }
                  icon="flask-outline"
                  label={t(
                    "research.science",
                  )}
                  onPress={() =>
                    selectFilter(
                      "science",
                    )
                  }
                  value={
                    briefing.counts
                      .papers +
                    briefing.counts
                      .studies
                  }
                />

                <InteractiveMetric
                  active={
                    activeFilter ===
                    "videos"
                  }
                  icon="videocam-outline"
                  label={t(
                    "research.videos",
                  )}
                  onPress={() =>
                    selectFilter(
                      "videos",
                    )
                  }
                  value={
                    briefing.counts
                      .videos
                  }
                />

                <InteractiveMetric
                  active={
                    activeFilter ===
                    "startups"
                  }
                  icon="rocket-outline"
                  label={t(
                    "research.startups",
                  )}
                  onPress={() =>
                    selectFilter(
                      "startups",
                    )
                  }
                  value={
                    briefing.counts
                      .startups
                  }
                />

                <InteractiveMetric
                  active={
                    activeFilter ===
                    "trends"
                  }
                  icon="trending-up-outline"
                  label={t(
                    "research.trends",
                  )}
                  onPress={() =>
                    selectFilter(
                      "trends",
                    )
                  }
                  value={
                    briefing.counts
                      .trends
                  }
                />

                <InteractiveMetric
                  active={
                    activeFilter ===
                    "knowledge-gaps"
                  }
                  icon="bulb-outline"
                  label={t(
                    "research.gaps",
                  )}
                  onPress={() =>
                    selectFilter(
                      "knowledge-gaps",
                    )
                  }
                  value={
                    briefing.counts
                      .knowledgeGaps
                  }
                />
              </View>

              {briefing.counts
                .discarded > 0 ? (
                <View
                  style={
                    styles.discardedRow
                  }
                >
                  <Ionicons
                    color={
                      universeTheme.colors
                        .textMuted
                    }
                    name="trash-outline"
                    size={13}
                  />

                  <Text
                    style={
                      styles.discarded
                    }
                  >
                    {
                      briefing.counts
                        .discarded
                    }{" "}
                    {t(
                      "research.discarded",
                    )}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View
          onLayout={
            saveDetailPosition
          }
        >
          {activeFilter ? (
            <BriefingDetail
              activeFilter={
                activeFilter
              }
              candidates={
                filteredCandidates
              }
              insights={
                selectedInsights
              }
              knowledgeGaps={
                knowledgeGaps
              }
              onClear={() => {
                setActiveFilter(null);
              }}
            />
          ) : null}
        </View>

        {research &&
        research.interests.length >
          0 ? (
          <View style={styles.section}>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              KNOWLEDGE SIGNALS
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              {t(
                "research.interests",
              )}
            </Text>

            <ScrollView
              contentContainerStyle={
                styles.interestContent
              }
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              style={
                styles.interestScroll
              }
            >
              {research.interests.map(
                (interest) => (
                  <View
                    key={interest.id}
                    style={
                      styles.interestCard
                    }
                  >
                    <View
                      style={
                        styles.interestHeader
                      }
                    >
                      <View
                        style={
                          styles.interestIcon
                        }
                      >
                        <Ionicons
                          color={
                            universeTheme
                              .colors
                              .violet
                          }
                          name="radio-outline"
                          size={18}
                        />
                      </View>

                      <Text
                        style={
                          styles.interestStrength
                        }
                      >
                        {Math.round(
                          interest.strength *
                            100,
                        )}
                        %
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.interestTitle
                      }
                    >
                      {interest.title}
                    </Text>

                    <Text
                      style={
                        styles.interestEntries
                      }
                    >
                      {
                        interest.discoveryCount
                      }{" "}
                      {t(
                        "research.entries",
                      )}
                    </Text>

                    <View
                      style={
                        styles.trendRow
                      }
                    >
                      <Ionicons
                        color={getTrendColor(
                          interest.trend,
                        )}
                        name={getTrendIcon(
                          interest.trend,
                        )}
                        size={15}
                      />

                      <Text
                        style={[
                          styles.trend,

                          {
                            color:
                              getTrendColor(
                                interest.trend,
                              ),
                          },
                        ]}
                      >
                        {t(
                          `research.trend.${interest.trend}`,
                        )}
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.trendExplanation
                      }
                    >
                      {
                        interest.trendExplanation
                      }
                    </Text>

                    {interest.knowledgeGaps
                      .slice(0, 3)
                      .map((gap) => (
                        <View
                          key={gap}
                          style={
                            styles.gapRow
                          }
                        >
                          <View
                            style={
                              styles.gapDot
                            }
                          />

                          <Text
                            style={
                              styles.gap
                            }
                          >
                            {gap}
                          </Text>
                        </View>
                      ))}
                  </View>
                ),
              )}
            </ScrollView>
          </View>
        ) : null}

        {latestInsights.length >
        0 ? (
          <View style={styles.section}>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              AI CONNECTIONS
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              {t(
                "research.newInsights",
              )}
            </Text>

            <View
              style={
                styles.insightList
              }
            >
              {latestInsights.map(
                (insight) => (
                  <ResearchInsightCard
                    insight={insight}
                    key={insight.id}
                  />
                ),
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                MISSION INBOX
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                {activeFilter
                  ? getFilterTitle(
                      activeFilter,
                      t,
                    )
                  : t(
                      "research.inbox",
                    )}
              </Text>

              {activeFilter ? (
                <Text
                  style={
                    styles.filterSubtitle
                  }
                >
                  Gefilterte
                  Recherchevorschläge
                </Text>
              ) : null}
            </View>

            <View
              style={styles.countBadge}
            >
              <Text
                style={styles.count}
              >
                {
                  visibleCandidates.length
                }
              </Text>
            </View>
          </View>

          {visibleCandidates.length >
          0 ? (
            <View
              style={
                styles.candidateList
              }
            >
              {visibleCandidates.map(
                (candidate) => (
                  <ResearchCandidateCard
                    candidate={candidate}
                    isBusy={
                      activeCandidateId ===
                      candidate.id
                    }
                    key={candidate.id}
                    onDismiss={(id) => {
                      void dismiss(id);
                    }}
                    onSave={(id) => {
                      void save(id);
                    }}
                  />
                ),
              )}
            </View>
          ) : !isLoading ? (
            <MessageCard
              icon="planet-outline"
              message={
                activeFilter
                  ? "Für diese Kategorie liegen momentan keine offenen Recherchevorschläge vor."
                  : t(
                      "research.noSuggestionsText",
                    )
              }
              title={
                activeFilter
                  ? "Keine passenden Vorschläge"
                  : t(
                      "research.noSuggestions",
                    )
              }
              tone="neutral"
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function InteractiveMetric({
  active,
  icon,
  label,
  value,
  onPress,
}: {
  active: boolean;
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.metric,

        active &&
          styles.metricActive,

        pressed &&
          styles.metricPressed,
      ]}
    >
      <View
        style={
          styles.metricHeader
        }
      >
        <View
          style={[
            styles.metricIcon,

            active &&
              styles.metricIconActive,
          ]}
        >
          <Ionicons
            color={
              active
                ? "#03111E"
                : universeTheme
                    .colors.primary
            }
            name={icon}
            size={17}
          />
        </View>

        <Ionicons
          color={
            active
              ? universeTheme.colors
                  .primaryBright
              : universeTheme.colors
                  .textMuted
          }
          name={
            active
              ? "chevron-up"
              : "chevron-forward"
          }
          size={14}
        />
      </View>

      <Text
        style={[
          styles.metricValue,

          active &&
            styles.metricValueActive,
        ]}
      >
        {value}
      </Text>

      <Text
        numberOfLines={2}
        style={[
          styles.metricLabel,

          active &&
            styles.metricLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BriefingDetail({
  activeFilter,
  candidates,
  insights,
  knowledgeGaps,
  onClear,
}: {
  activeFilter:
    BriefingFilter;
  candidates:
    ResearchCandidate[];
  insights:
    ResearchInsight[];
  knowledgeGaps: string[];
  onClear: () => void;
}) {
  const { t } =
    useAppSettings();

  const showKnowledgeGaps =
    activeFilter ===
    "knowledge-gaps";

  const showInsights =
    activeFilter === "trends" ||
    activeFilter ===
      "knowledge-gaps";

  return (
    <View
      style={
        styles.briefingDetail
      }
    >
      <View
        style={
          styles.briefingDetailHeader
        }
      >
        <View style={styles.flex}>
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            SELECTED SIGNAL
          </Text>

          <Text
            style={
              styles.sectionTitle
            }
          >
            {getFilterTitle(
              activeFilter,
              t,
            )}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Filter entfernen"
          accessibilityRole="button"
          onPress={onClear}
          style={({ pressed }) => [
            styles.clearFilterButton,

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
            size={19}
          />
        </Pressable>
      </View>

      <Text
        style={
          styles.detailExplanation
        }
      >
        {getFilterDescription(
          activeFilter,
          candidates.length,
        )}
      </Text>

      {showKnowledgeGaps &&
      knowledgeGaps.length > 0 ? (
        <View
          style={
            styles.knowledgeGapList
          }
        >
          <Text
            style={
              styles.detailSmallTitle
            }
          >
            Erkannte Wissenslücken
          </Text>

          {knowledgeGaps.map(
            (gap) => (
              <View
                key={gap}
                style={
                  styles.knowledgeGapRow
                }
              >
                <View
                  style={
                    styles.knowledgeGapIcon
                  }
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors.orange
                    }
                    name="bulb-outline"
                    size={17}
                  />
                </View>

                <Text
                  style={
                    styles.knowledgeGapText
                  }
                >
                  {gap}
                </Text>
              </View>
            ),
          )}
        </View>
      ) : null}

      {showInsights &&
      insights.length > 0 ? (
        <View
          style={
            styles.detailInsightSection
          }
        >
          <Text
            style={
              styles.detailSmallTitle
            }
          >
            Zugehörige Erkenntnisse
          </Text>

          <View
            style={
              styles.insightList
            }
          >
            {insights.map(
              (insight) => (
                <ResearchInsightCard
                  insight={insight}
                  key={insight.id}
                />
              ),
            )}
          </View>
        </View>
      ) : null}

      <View
        style={
          styles.detailCandidateSummary
        }
      >
        <Ionicons
          color={
            universeTheme.colors
              .primaryBright
          }
          name="sparkles-outline"
          size={18}
        />

        <Text
          style={
            styles.detailCandidateText
          }
        >
          SaveWise hat{" "}
          <Text
            style={
              styles.detailCandidateCount
            }
          >
            {candidates.length}
          </Text>{" "}
          offene Vorschläge für diesen
          Bereich gefunden.
        </Text>
      </View>
    </View>
  );
}

function ResearchInsightCard({
  insight,
}: {
  insight: ResearchInsight;
}) {
  const color =
    getInsightColor(
      insight.kind,
    );

  return (
    <View
      style={[
        styles.insightCard,

        {
          borderColor:
            `${color}44`,
        },
      ]}
    >
      <View
        style={[
          styles.insightIcon,

          {
            backgroundColor:
              `${color}16`,
          },
        ]}
      >
        <Ionicons
          color={color}
          name={getInsightIcon(
            insight.kind,
          )}
          size={20}
        />
      </View>

      <View style={styles.flex}>
        <Text
          style={
            styles.insightEyebrow
          }
        >
          {formatInsightKind(
            insight.kind,
          )}
        </Text>

        <Text
          style={
            styles.insightTitle
          }
        >
          {insight.title}
        </Text>

        <Text
          style={
            styles.insightText
          }
        >
          {insight.description}
        </Text>
      </View>
    </View>
  );
}

function MessageCard({
  title,
  message,
  icon,
  tone,
}: {
  title: string;
  message: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  tone:
    | "warning"
    | "error"
    | "neutral";
}) {
  const color =
    tone === "error"
      ? universeTheme.colors
          .danger
      : tone === "warning"
        ? universeTheme.colors
            .orange
        : universeTheme.colors
            .primaryBright;

  return (
    <View
      style={[
        styles.messageCard,

        {
          borderColor:
            `${color}44`,
        },
      ]}
    >
      <View
        style={[
          styles.messageIcon,

          {
            backgroundColor:
              `${color}14`,
          },
        ]}
      >
        <Ionicons
          color={color}
          name={icon}
          size={21}
        />
      </View>

      <View style={styles.flex}>
        <Text
          style={
            styles.messageTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.messageText
          }
        >
          {message}
        </Text>
      </View>
    </View>
  );
}

function getFilteredCandidates({
  activeFilter,
  candidates,
  briefingCandidateIds,
  insights,
}: {
  activeFilter:
    | BriefingFilter
    | null;
  candidates:
    ResearchCandidate[];
  briefingCandidateIds:
    string[];
  insights:
    ResearchInsight[];
}): ResearchCandidate[] {
  if (!activeFilter) {
    return candidates;
  }

  const briefingCandidateSet =
    new Set(
      briefingCandidateIds,
    );

  if (activeFilter === "all") {
    if (
      briefingCandidateSet.size ===
      0
    ) {
      return candidates;
    }

    return candidates.filter(
      (candidate) =>
        briefingCandidateSet.has(
          candidate.id,
        ),
    );
  }

  if (
    activeFilter ===
    "knowledge-gaps"
  ) {
    const gapCandidateIds =
      new Set(
        insights
          .filter(
            (insight) =>
              insight.kind ===
              "knowledge-gap",
          )
          .flatMap(
            (insight) =>
              insight.candidateIds,
          ),
      );

    return candidates.filter(
      (candidate) =>
        gapCandidateIds.has(
          candidate.id,
        ) ||
        candidate.scores
          .gapCoverage > 0,
    );
  }

  if (
    activeFilter === "trends"
  ) {
    const trendCandidateIds =
      new Set(
        insights
          .filter(
            (insight) =>
              insight.kind ===
              "trend",
          )
          .flatMap(
            (insight) =>
              insight.candidateIds,
          ),
      );

    return candidates.filter(
      (candidate) =>
        trendCandidateIds.has(
          candidate.id,
        ) ||
        candidate.sourceType ===
          "news" ||
        candidate.sourceType ===
          "technology",
    );
  }

  const acceptedTypes =
    getSourceTypesForFilter(
      activeFilter,
    );

  return candidates.filter(
    (candidate) =>
      acceptedTypes.includes(
        candidate.sourceType,
      ),
  );
}

function getFilteredInsights(
  insights: ResearchInsight[],
  activeFilter:
    | BriefingFilter
    | null,
): ResearchInsight[] {
  if (
    activeFilter === "trends"
  ) {
    return insights.filter(
      (insight) =>
        insight.kind === "trend",
    );
  }

  if (
    activeFilter ===
    "knowledge-gaps"
  ) {
    return insights.filter(
      (insight) =>
        insight.kind ===
        "knowledge-gap",
    );
  }

  return [];
}

function getSourceTypesForFilter(
  filter: BriefingFilter,
): ResearchSourceType[] {
  switch (filter) {
    case "science":
      return [
        "paper",
        "study",
        "whitepaper",
      ];

    case "videos":
      return [
        "video",
        "podcast",
      ];

    case "startups":
      return [
        "startup",
        "company",
        "product",
      ];

    default:
      return [];
  }
}

function getFilterTitle(
  filter: BriefingFilter,
  t: (
    key: string,
  ) => string,
): string {
  switch (filter) {
    case "all":
      return t(
        "research.found",
      );

    case "science":
      return t(
        "research.science",
      );

    case "videos":
      return t(
        "research.videos",
      );

    case "startups":
      return t(
        "research.startups",
      );

    case "trends":
      return t(
        "research.trends",
      );

    case "knowledge-gaps":
      return t(
        "research.gaps",
      );
  }
}

function getFilterDescription(
  filter: BriefingFilter,
  candidateCount: number,
): string {
  switch (filter) {
    case "all":
      return `${candidateCount} offene Vorschläge gehören zum aktuellen täglichen Briefing.`;

    case "science":
      return "SaveWise zeigt hier relevante Studien, wissenschaftliche Arbeiten und Whitepaper.";

    case "videos":
      return "Hier erscheinen gefundene Videos und Podcasts, die dein Wissen ergänzen können.";

    case "startups":
      return "Hier zeigt SaveWise neue Startups, Unternehmen und Produkte passend zu deinen Interessen.";

    case "trends":
      return "Diese Erkenntnisse und Quellen weisen auf neue oder steigende Themen hin.";

    case "knowledge-gaps":
      return "SaveWise hat Bereiche erkannt, in denen dein bisheriges Wissen noch ergänzt werden könnte.";
  }
}

function getTrendIcon(
  trend: string,
): keyof typeof Ionicons.glyphMap {
  if (trend === "rising") {
    return "trending-up";
  }

  if (
    trend === "declining"
  ) {
    return "trending-down";
  }

  if (trend === "new") {
    return "sparkles-outline";
  }

  if (
    trend === "long-term"
  ) {
    return "time-outline";
  }

  return "remove-outline";
}

function getTrendColor(
  trend: string,
): string {
  if (
    trend === "rising" ||
    trend === "new"
  ) {
    return universeTheme.colors
      .green;
  }

  if (
    trend === "declining"
  ) {
    return universeTheme.colors
      .orange;
  }

  return universeTheme.colors
    .textSecondary;
}

function getInsightIcon(
  kind: string,
): keyof typeof Ionicons.glyphMap {
  if (
    kind === "contradiction"
  ) {
    return "git-compare-outline";
  }

  if (
    kind === "confirmation"
  ) {
    return "checkmark-circle-outline";
  }

  if (
    kind === "knowledge-gap"
  ) {
    return "search-outline";
  }

  return "trending-up-outline";
}

function getInsightColor(
  kind: string,
): string {
  if (
    kind === "contradiction"
  ) {
    return universeTheme.colors
      .orange;
  }

  if (
    kind === "confirmation"
  ) {
    return universeTheme.colors
      .green;
  }

  if (
    kind === "knowledge-gap"
  ) {
    return universeTheme.colors
      .violet;
  }

  return universeTheme.colors
    .primaryBright;
}

function formatInsightKind(
  kind: string,
): string {
  return kind
    .split("-")
    .join(" ")
    .toUpperCase();
}

function uniqueStrings(
  values: string[],
): string[] {
  const seen =
    new Set<string>();

  const result: string[] =
    [];

  for (const value of values) {
    const normalizedValue =
      value.trim();

    if (
      !normalizedValue ||
      seen.has(
        normalizedValue.toLocaleLowerCase(),
      )
    ) {
      continue;
    }

    seen.add(
      normalizedValue.toLocaleLowerCase(),
    );

    result.push(normalizedValue);
  }

  return result;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor:
      universeTheme.colors
        .background,

    flex: 1,
  },

  content: {
    paddingBottom: 130,

    paddingHorizontal: 18,

    paddingTop: 58,
  },

  flex: {
    flex: 1,
  },

  header: {
    marginBottom: 22,
  },

  headerRow: {
    alignItems: "center",

    flexDirection: "row",

    gap: 12,
  },

  scoutIcon: {
    alignItems: "center",

    backgroundColor:
      "rgba(56, 189, 248, 0.1)",

    borderColor:
      universeTheme.colors
        .primaryBright,

    borderRadius: 17,

    borderWidth: 1.5,

    height: 52,

    justifyContent: "center",

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.55,

    shadowRadius: 16,

    width: 52,
  },

  eyebrow: {
    color:
      universeTheme.colors.primary,

    fontSize: 9,

    fontWeight: "800",

    letterSpacing: 1.5,
  },

  title: {
    color:
      universeTheme.colors.text,

    fontSize: 27,

    fontWeight: "900",

    lineHeight: 33,
  },

  subtitle: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 14,

    lineHeight: 21,

    marginTop: 13,

    maxWidth: 355,
  },

  statusBadge: {
    alignItems: "center",

    backgroundColor:
      "rgba(74, 222, 128, 0.06)",

    borderColor:
      "rgba(74, 222, 128, 0.22)",

    borderRadius: 999,

    borderWidth: 1,

    flexDirection: "row",

    gap: 5,

    paddingHorizontal: 9,

    paddingVertical: 6,
  },

  statusDot: {
    backgroundColor:
      universeTheme.colors.green,

    borderRadius: 999,

    height: 6,

    width: 6,
  },

  statusText: {
    color:
      universeTheme.colors.green,

    fontSize: 8,

    fontWeight: "900",

    letterSpacing: 0.7,
  },

  missionCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",

    borderColor:
      universeTheme.colors
        .borderStrong,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    padding: 17,

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.17,

    shadowRadius: 16,
  },

  missionHeader: {
    alignItems: "center",

    flexDirection: "row",

    justifyContent:
      "space-between",
  },

  sectionEyebrow: {
    color:
      universeTheme.colors.primary,

    fontSize: 9,

    fontWeight: "800",

    letterSpacing: 1.3,
  },

  missionTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 19,

    fontWeight: "900",

    marginTop: 3,
  },

  missionStatus: {
    alignItems: "center",

    backgroundColor:
      "rgba(74, 222, 128, 0.06)",

    borderColor:
      "rgba(74, 222, 128, 0.2)",

    borderRadius: 999,

    borderWidth: 1,

    flexDirection: "row",

    gap: 6,

    paddingHorizontal: 9,

    paddingVertical: 7,
  },

  missionStatusText: {
    color:
      universeTheme.colors.green,

    fontSize: 8,

    fontWeight: "900",

    letterSpacing: 0.8,
  },

  missionText: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 12,

    lineHeight: 19,

    marginTop: 12,
  },

  runButton: {
    alignItems: "center",

    backgroundColor:
      universeTheme.colors
        .primaryBright,

    borderRadius:
      universeTheme.radius.md,

    flexDirection: "row",

    gap: 8,

    justifyContent: "center",

    marginTop: 15,

    minHeight: 52,

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.42,

    shadowRadius: 14,
  },

  runButtonText: {
    color: "#03111E",

    fontSize: 14,

    fontWeight: "900",
  },

  disabled: {
    opacity: 0.42,
  },

  pressed: {
    opacity: 0.7,
  },

  loading: {
    alignItems: "center",

    paddingVertical: 70,
  },

  loadingText: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 12,

    marginTop: 13,
  },

  section: {
    marginTop: 34,
  },

  sectionHeading: {
    alignItems: "center",

    flexDirection: "row",

    justifyContent:
      "space-between",

    marginBottom: 12,
  },

  sectionTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 21,

    fontWeight: "900",

    marginTop: 3,
  },

  briefingSignal: {
    alignItems: "center",

    backgroundColor:
      "rgba(74, 222, 128, 0.06)",

    borderColor:
      "rgba(74, 222, 128, 0.2)",

    borderRadius: 999,

    borderWidth: 1,

    flexDirection: "row",

    gap: 5,

    paddingHorizontal: 8,

    paddingVertical: 6,
  },

  signalDot: {
    backgroundColor:
      universeTheme.colors.green,

    borderRadius: 999,

    height: 5,

    width: 5,
  },

  signalText: {
    color:
      universeTheme.colors.green,

    fontSize: 8,

    fontWeight: "900",

    letterSpacing: 0.8,
  },

  briefingCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.96)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    overflow: "hidden",

    padding: 17,
  },

  briefingTopGlow: {
    backgroundColor:
      universeTheme.colors.yellow,

    height: 2,

    left: 0,

    opacity: 0.75,

    position: "absolute",

    right: 0,

    top: 0,
  },

  briefingHeader: {
    alignItems: "center",

    flexDirection: "row",

    gap: 11,
  },

  briefingIcon: {
    alignItems: "center",

    backgroundColor:
      "rgba(250, 204, 21, 0.08)",

    borderRadius: 13,

    height: 44,

    justifyContent: "center",

    width: 44,
  },

  briefingTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 17,

    fontWeight: "900",

    lineHeight: 22,
  },

  briefingDate: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 10,

    marginTop: 3,
  },

  briefingSummary: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 13,

    lineHeight: 20,

    marginTop: 15,
  },

  metricHint: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 10,

    lineHeight: 16,

    marginTop: 16,
  },

  metricsGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap: 8,

    marginTop: 12,
  },

  metric: {
    backgroundColor:
      "rgba(3, 12, 24, 0.7)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.md,

    borderWidth: 1,

    minHeight: 112,

    padding: 11,

    width: "31.7%",
  },

  metricActive: {
    backgroundColor:
      "rgba(56, 189, 248, 0.13)",

    borderColor:
      universeTheme.colors
        .primaryBright,

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.28,

    shadowRadius: 10,
  },

  metricPressed: {
    opacity: 0.7,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  metricHeader: {
    alignItems: "center",

    flexDirection: "row",

    justifyContent:
      "space-between",
  },

  metricIcon: {
    alignItems: "center",

    backgroundColor:
      "rgba(56, 189, 248, 0.08)",

    borderRadius: 9,

    height: 30,

    justifyContent: "center",

    width: 30,
  },

  metricIconActive: {
    backgroundColor:
      universeTheme.colors
        .primaryBright,
  },

  metricValue: {
    color:
      universeTheme.colors.text,

    fontSize: 20,

    fontWeight: "900",

    marginTop: 9,
  },

  metricValueActive: {
    color:
      universeTheme.colors
        .primaryBright,
  },

  metricLabel: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 9,

    lineHeight: 13,

    marginTop: 2,
  },

  metricLabelActive: {
    color:
      universeTheme.colors.text,
  },

  discardedRow: {
    alignItems: "center",

    flexDirection: "row",

    gap: 6,

    marginTop: 13,
  },

  discarded: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 10,
  },

  briefingDetail: {
    backgroundColor:
      "rgba(6, 20, 36, 0.96)",

    borderColor:
      universeTheme.colors
        .primaryBright,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    marginTop: 22,

    padding: 16,

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.16,

    shadowRadius: 13,
  },

  briefingDetailHeader: {
    alignItems: "flex-start",

    flexDirection: "row",

    justifyContent:
      "space-between",
  },

  clearFilterButton: {
    alignItems: "center",

    backgroundColor:
      "rgba(148, 163, 184, 0.07)",

    borderColor:
      universeTheme.colors.border,

    borderRadius: 999,

    borderWidth: 1,

    height: 36,

    justifyContent: "center",

    width: 36,
  },

  detailExplanation: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 12,

    lineHeight: 19,

    marginTop: 12,
  },

  knowledgeGapList: {
    gap: 8,

    marginTop: 16,
  },

  detailSmallTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 12,

    fontWeight: "900",

    marginBottom: 6,
  },

  knowledgeGapRow: {
    alignItems: "center",

    backgroundColor:
      "rgba(251, 146, 60, 0.05)",

    borderColor:
      "rgba(251, 146, 60, 0.18)",

    borderRadius:
      universeTheme.radius.md,

    borderWidth: 1,

    flexDirection: "row",

    gap: 9,

    padding: 11,
  },

  knowledgeGapIcon: {
    alignItems: "center",

    backgroundColor:
      "rgba(251, 146, 60, 0.08)",

    borderRadius: 10,

    height: 34,

    justifyContent: "center",

    width: 34,
  },

  knowledgeGapText: {
    color:
      universeTheme.colors.text,

    flex: 1,

    fontSize: 11,

    lineHeight: 17,
  },

  detailInsightSection: {
    marginTop: 17,
  },

  detailCandidateSummary: {
    alignItems: "center",

    backgroundColor:
      "rgba(56, 189, 248, 0.05)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.md,

    borderWidth: 1,

    flexDirection: "row",

    gap: 9,

    marginTop: 17,

    padding: 12,
  },

  detailCandidateText: {
    color:
      universeTheme.colors
        .textSecondary,

    flex: 1,

    fontSize: 11,

    lineHeight: 17,
  },

  detailCandidateCount: {
    color:
      universeTheme.colors
        .primaryBright,

    fontWeight: "900",
  },

  interestScroll: {
    marginHorizontal: -18,

    marginTop: 12,
  },

  interestContent: {
    gap: 10,

    paddingHorizontal: 18,
  },

  interestCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",

    borderColor:
      "rgba(139, 92, 246, 0.24)",

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    padding: 15,

    width: 245,
  },

  interestHeader: {
    alignItems: "center",

    flexDirection: "row",

    justifyContent:
      "space-between",
  },

  interestIcon: {
    alignItems: "center",

    backgroundColor:
      "rgba(139, 92, 246, 0.08)",

    borderRadius: 11,

    height: 36,

    justifyContent: "center",

    width: 36,
  },

  interestTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 16,

    fontWeight: "900",

    marginTop: 13,
  },

  interestStrength: {
    color:
      universeTheme.colors.violet,

    fontSize: 15,

    fontWeight: "900",
  },

  interestEntries: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 10,

    marginTop: 4,
  },

  trendRow: {
    alignItems: "center",

    flexDirection: "row",

    gap: 6,

    marginTop: 12,
  },

  trend: {
    fontSize: 10,

    fontWeight: "800",
  },

  trendExplanation: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 10,

    lineHeight: 16,

    marginTop: 6,
  },

  gapRow: {
    alignItems: "flex-start",

    flexDirection: "row",

    gap: 7,

    marginTop: 9,
  },

  gapDot: {
    backgroundColor:
      universeTheme.colors.orange,

    borderRadius: 999,

    height: 5,

    marginTop: 5,

    width: 5,
  },

  gap: {
    color:
      universeTheme.colors
        .textSecondary,

    flex: 1,

    fontSize: 10,

    lineHeight: 15,
  },

  insightList: {
    gap: 9,

    marginTop: 12,
  },

  insightCard: {
    alignItems: "flex-start",

    backgroundColor:
      "rgba(6, 20, 36, 0.94)",

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    flexDirection: "row",

    gap: 11,

    padding: 14,
  },

  insightIcon: {
    alignItems: "center",

    borderRadius: 11,

    height: 38,

    justifyContent: "center",

    width: 38,
  },

  insightEyebrow: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 8,

    fontWeight: "800",

    letterSpacing: 0.9,
  },

  insightTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 13,

    fontWeight: "900",

    marginTop: 3,
  },

  insightText: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 11,

    lineHeight: 17,

    marginTop: 4,
  },

  sectionHeader: {
    alignItems: "center",

    flexDirection: "row",

    justifyContent:
      "space-between",

    marginBottom: 14,
  },

  filterSubtitle: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 10,

    marginTop: 4,
  },

  countBadge: {
    alignItems: "center",

    backgroundColor:
      "rgba(56, 189, 248, 0.08)",

    borderColor:
      universeTheme.colors.border,

    borderRadius: 999,

    borderWidth: 1,

    height: 34,

    justifyContent: "center",

    minWidth: 34,

    paddingHorizontal: 10,
  },

  count: {
    color:
      universeTheme.colors
        .primaryBright,

    fontSize: 12,

    fontWeight: "900",
  },

  candidateList: {
    gap: 13,
  },

  messageCard: {
    alignItems: "flex-start",

    backgroundColor:
      "rgba(6, 20, 36, 0.94)",

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    flexDirection: "row",

    gap: 11,

    marginTop: 16,

    padding: 15,
  },

  messageIcon: {
    alignItems: "center",

    borderRadius: 11,

    height: 40,

    justifyContent: "center",

    width: 40,
  },

  messageTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 14,

    fontWeight: "900",
  },

  messageText: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 11,

    lineHeight: 17,

    marginTop: 4,
  },
});