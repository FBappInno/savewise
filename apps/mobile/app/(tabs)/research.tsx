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

import { ResearchCandidateCard } from "@/components/research/research-candidate-card";
import { useResearchAgent } from "@/hooks/use-research-agent";
import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";

import type {
  ResearchCandidate,
  ResearchInsight,
  ResearchSourceType,
} from "@savewise/shared";

type BriefingFilter =
  | "all"
  | "science"
  | "videos"
  | "startups"
  | "trends"
  | "knowledge-gaps";

export default function ResearchScreen() {
  const { settings, t } =
    useAppSettings();

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

    setActiveFilter(
      nextFilter,
    );

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
    <ScrollView
      contentContainerStyle={
        styles.content
      }
      ref={scrollViewRef}
      refreshControl={
        <RefreshControl
          refreshing={
            isResearching
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
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          {t("research.eyebrow")}
        </Text>

        <Text style={styles.title}>
          {t("research.title")}
        </Text>

        <Text style={styles.subtitle}>
          {t("research.subtitle")}
        </Text>
      </View>

      <Pressable
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
          <ActivityIndicator
            color="#ffffff"
          />
        ) : (
          <>
            <Ionicons
              color="#ffffff"
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

      {!settings.ai
        .autonomousResearch ? (
        <View
          style={
            styles.messageCard
          }
        >
          <Text
            style={
              styles.messageText
            }
          >
            {t("research.disabled")}
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          style={
            styles.messageCard
          }
        >
          <Text
            style={
              styles.messageText
            }
          >
            {error}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : null}

      {briefing ? (
        <View style={styles.section}>
          <Text
            style={
              styles.sectionLabel
            }
          >
            {t(
              "research.dailyBriefing",
            )}
          </Text>

          <View
            style={
              styles.briefingCard
            }
          >
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
                    theme.colors
                      .primary
                  }
                  name="sunny-outline"
                  size={22}
                />
              </View>

              <View style={styles.flex}>
                <Text
                  style={
                    styles.messageTitle
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
                styles.messageText
              }
            >
              {briefing.summary}
            </Text>

            <Text
              style={
                styles.metricHint
              }
            >
              Tippe auf eine Kennzahl,
              um die zugehörigen
              Vorschläge und Erkenntnisse
              anzuzeigen.
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
              styles.sectionLabel
            }
          >
            {t(
              "research.interests",
            )}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
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
                  <Text
                    style={
                      styles.interestTitle
                    }
                  >
                    {interest.title}
                  </Text>

                  <Text
                    style={
                      styles.interestStrength
                    }
                  >
                    {Math.round(
                      interest.strength *
                        100,
                    )}
                    % ·{" "}
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
                      <Text
                        key={gap}
                        style={
                          styles.gap
                        }
                      >
                        • {gap}
                      </Text>
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
              styles.sectionLabel
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

          <Text style={styles.count}>
            {
              visibleCandidates.length
            }
          </Text>
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
          <View
            style={
              styles.messageCard
            }
          >
            <Text
              style={
                styles.messageTitle
              }
            >
              {activeFilter
                ? "Keine passenden Vorschläge"
                : t(
                    "research.noSuggestions",
                  )}
            </Text>

            <Text
              style={
                styles.messageText
              }
            >
              {activeFilter
                ? "Für diese Kategorie liegen momentan keine offenen Recherchevorschläge vor."
                : t(
                    "research.noSuggestionsText",
                  )}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
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
  icon: keyof typeof Ionicons.glyphMap;
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
        <Ionicons
          color={
            active
              ? theme.colors
                  .textOnPrimary
              : theme.colors.primary
          }
          name={icon}
          size={17}
        />

        <Ionicons
          color={
            active
              ? theme.colors
                  .textOnPrimary
              : theme.colors
                  .placeholder
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
  activeFilter: BriefingFilter;
  candidates: ResearchCandidate[];
  insights: ResearchInsight[];
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
              styles.sectionLabel
            }
          >
            AUSGEWÄHLTER BEREICH
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
              theme.colors
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
                      theme.colors
                        .primary
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
                  insight={
                    insight
                  }
                  key={
                    insight.id
                  }
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
            theme.colors.primary
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
  return (
    <View
      style={styles.insightCard}
    >
      <Ionicons
        color={
          theme.colors.primary
        }
        name={getInsightIcon(
          insight.kind,
        )}
        size={20}
      />

      <View style={styles.flex}>
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

function getFilteredCandidates({
  activeFilter,
  candidates,
  briefingCandidateIds,
  insights,
}: {
  activeFilter:
    | BriefingFilter
    | null;
  candidates: ResearchCandidate[];
  briefingCandidateIds: string[];
  insights: ResearchInsight[];
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
      return t("research.found");

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
      return `SaveWise zeigt hier relevante Studien, wissenschaftliche Arbeiten und Whitepaper.`;

    case "videos":
      return `Hier erscheinen gefundene Videos und Podcasts, die dein Wissen ergänzen können.`;

    case "startups":
      return `Hier zeigt SaveWise neue Startups, Unternehmen und Produkte passend zu deinen Interessen.`;

    case "trends":
      return `Diese Erkenntnisse und Quellen weisen auf neue oder steigende Themen hin.`;

    case "knowledge-gaps":
      return `SaveWise hat Bereiche erkannt, in denen dein bisheriges Wissen noch ergänzt werden könnte.`;
  }
}

function getTrendIcon(
  trend: string,
): keyof typeof Ionicons.glyphMap {
  if (trend === "rising") {
    return "trending-up";
  }

  if (trend === "declining") {
    return "trending-down";
  }

  if (trend === "new") {
    return "sparkles-outline";
  }

  if (trend === "long-term") {
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
    return "#147D64";
  }

  if (
    trend === "declining"
  ) {
    return "#B45B35";
  }

  return theme.colors
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

    result.push(
      normalizedValue,
    );
  }

  return result;
}

const styles =
  StyleSheet.create({
    screen: {
      backgroundColor:
        theme.colors.background,
    },

    content: {
      paddingBottom:
        theme.spacing.xxxl,

      paddingHorizontal:
        theme.spacing.xl,

      paddingTop:
        theme.spacing.xxxl +
        theme.spacing.sm,
    },

    header: {
      marginBottom:
        theme.spacing.xxl,
    },

    eyebrow: {
      ...theme.typography.caption,

      color:
        theme.colors.primary,

      letterSpacing: 1.2,
    },

    title: {
      ...theme.typography
        .screenTitle,

      color:
        theme.colors.text,

      marginTop:
        theme.spacing.sm,
    },

    subtitle: {
      ...theme.typography.body,

      color:
        theme.colors
          .textSecondary,

      lineHeight: 22,

      marginTop:
        theme.spacing.sm,
    },

    runButton: {
      alignItems: "center",

      backgroundColor:
        theme.colors.primary,

      borderRadius:
        theme.radius.lg,

      flexDirection: "row",

      gap:
        theme.spacing.sm,

      justifyContent:
        "center",

      minHeight: 54,
    },

    runButtonText: {
      ...theme.typography
        .bodyStrong,

      color: "#ffffff",
    },

    disabled: {
      opacity: 0.45,
    },

    pressed: {
      opacity: 0.72,
    },

    loading: {
      padding:
        theme.spacing.xxxl,
    },

    flex: {
      flex: 1,
    },

    section: {
      marginTop:
        theme.spacing.xxxl,
    },

    sectionLabel: {
      ...theme.typography.caption,

      color:
        theme.colors.primary,

      letterSpacing: 1,

      marginBottom:
        theme.spacing.md,
    },

    briefingCard: {
      backgroundColor:
        theme.colors.surface,

      borderColor:
        theme.colors.border,

      borderRadius:
        theme.radius.lg,

      borderWidth: 1,

      padding:
        theme.spacing.lg,
    },

    briefingHeader: {
      alignItems: "center",

      flexDirection: "row",

      gap:
        theme.spacing.md,
    },

    briefingIcon: {
      alignItems: "center",

      backgroundColor:
        theme.colors.background,

      borderRadius: 999,

      height: 44,

      justifyContent:
        "center",

      width: 44,
    },

    briefingDate: {
      ...theme.typography.caption,

      color:
        theme.colors
          .textSecondary,

      marginTop: 2,
    },

    metricHint: {
      ...theme.typography.caption,

      color:
        theme.colors
          .textSecondary,

      lineHeight: 18,

      marginTop:
        theme.spacing.lg,
    },

    metricsGrid: {
      flexDirection: "row",

      flexWrap: "wrap",

      gap:
        theme.spacing.sm,

      marginTop:
        theme.spacing.md,
    },

    metric: {
      backgroundColor:
        theme.colors.background,

      borderColor:
        theme.colors.border,

      borderRadius:
        theme.radius.md,

      borderWidth: 1,

      minHeight: 112,

      padding:
        theme.spacing.md,

      width: "31%",
    },

    metricActive: {
      backgroundColor:
        theme.colors.primary,

      borderColor:
        theme.colors.primary,
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

    metricValue: {
      ...theme.typography
        .sectionTitle,

      color:
        theme.colors.text,

      marginTop:
        theme.spacing.sm,
    },

    metricValueActive: {
      color:
        theme.colors
          .textOnPrimary,
    },

    metricLabel: {
      ...theme.typography.caption,

      color:
        theme.colors
          .textSecondary,

      marginTop: 2,
    },

    metricLabelActive: {
      color:
        theme.colors
          .textOnPrimary,
    },

    discarded: {
      ...theme.typography.caption,

      color:
        theme.colors
          .textSecondary,

      marginTop:
        theme.spacing.md,
    },

    briefingDetail: {
      backgroundColor:
        theme.colors.surface,

      borderColor:
        theme.colors.primary,

      borderRadius:
        theme.radius.lg,

      borderWidth: 1,

      marginTop:
        theme.spacing.xxl,

      padding:
        theme.spacing.lg,
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
        theme.colors.background,

      borderRadius: 999,

      height: 36,

      justifyContent:
        "center",

      width: 36,
    },

    detailExplanation: {
      ...theme.typography.body,

      color:
        theme.colors
          .textSecondary,

      lineHeight: 21,

      marginTop:
        theme.spacing.md,
    },

    knowledgeGapList: {
      gap:
        theme.spacing.sm,

      marginTop:
        theme.spacing.lg,
    },

    detailSmallTitle: {
      ...theme.typography
        .bodyStrong,

      color:
        theme.colors.text,

      marginBottom:
        theme.spacing.sm,
    },

    knowledgeGapRow: {
      alignItems: "center",

      backgroundColor:
        theme.colors.background,

      borderRadius:
        theme.radius.md,

      flexDirection: "row",

      gap:
        theme.spacing.sm,

      padding:
        theme.spacing.md,
    },

    knowledgeGapIcon: {
      alignItems: "center",

      backgroundColor:
        theme.colors.surface,

      borderRadius: 999,

      height: 34,

      justifyContent:
        "center",

      width: 34,
    },

    knowledgeGapText: {
      ...theme.typography.body,

      color:
        theme.colors.text,

      flex: 1,

      lineHeight: 20,
    },

    detailInsightSection: {
      marginTop:
        theme.spacing.lg,
    },

    detailCandidateSummary: {
      alignItems: "center",

      backgroundColor:
        theme.colors.background,

      borderRadius:
        theme.radius.md,

      flexDirection: "row",

      gap:
        theme.spacing.sm,

      marginTop:
        theme.spacing.lg,

      padding:
        theme.spacing.md,
    },

    detailCandidateText: {
      ...theme.typography.body,

      color:
        theme.colors
          .textSecondary,

      flex: 1,
    },

    detailCandidateCount: {
      color:
        theme.colors.primary,

      fontWeight: "800",
    },

    interestCard: {
      backgroundColor:
        theme.colors.surface,

      borderColor:
        theme.colors.border,

      borderRadius:
        theme.radius.lg,

      borderWidth: 1,

      marginRight:
        theme.spacing.md,

      padding:
        theme.spacing.lg,

      width: 240,
    },

    interestTitle: {
      ...theme.typography
        .sectionTitle,

      color:
        theme.colors.text,
    },

    interestStrength: {
      ...theme.typography.caption,

      color:
        theme.colors.primary,

      marginTop:
        theme.spacing.xs,
    },

    trendRow: {
      alignItems: "center",

      flexDirection: "row",

      gap:
        theme.spacing.xs,

      marginTop:
        theme.spacing.md,
    },

    trend: {
      ...theme.typography.caption,

      fontWeight: "700",
    },

    trendExplanation: {
      ...theme.typography.caption,

      color:
        theme.colors
          .textSecondary,

      lineHeight: 18,

      marginTop:
        theme.spacing.xs,
    },

    gap: {
      ...theme.typography.caption,

      color:
        theme.colors
          .textSecondary,

      marginTop:
        theme.spacing.sm,
    },

    sectionHeader: {
      alignItems: "center",

      flexDirection: "row",

      justifyContent:
        "space-between",

      marginBottom:
        theme.spacing.lg,
    },

    sectionTitle: {
      ...theme.typography
        .sectionTitle,

      color:
        theme.colors.text,
    },

    filterSubtitle: {
      ...theme.typography.caption,

      color:
        theme.colors
          .textSecondary,

      marginTop:
        theme.spacing.xs,
    },

    count: {
      ...theme.typography.caption,

      color:
        theme.colors
          .textSecondary,
    },

    candidateList: {
      gap:
        theme.spacing.md,
    },

    messageCard: {
      backgroundColor:
        theme.colors.surface,

      borderColor:
        theme.colors.border,

      borderRadius:
        theme.radius.lg,

      borderWidth: 1,

      marginTop:
        theme.spacing.lg,

      padding:
        theme.spacing.lg,
    },

    messageTitle: {
      ...theme.typography
        .sectionTitle,

      color:
        theme.colors.text,
    },

    messageText: {
      ...theme.typography.body,

      color:
        theme.colors
          .textSecondary,

      lineHeight: 21,

      marginTop:
        theme.spacing.xs,
    },

    insightList: {
      gap:
        theme.spacing.sm,
    },

    insightCard: {
      backgroundColor:
        theme.colors.surface,

      borderColor:
        theme.colors.border,

      borderRadius:
        theme.radius.lg,

      borderWidth: 1,

      flexDirection: "row",

      gap:
        theme.spacing.md,

      padding:
        theme.spacing.lg,
    },

    insightTitle: {
      ...theme.typography
        .bodyStrong,

      color:
        theme.colors.text,
    },

    insightText: {
      ...theme.typography.caption,

      color:
        theme.colors
          .textSecondary,

      lineHeight: 18,

      marginTop:
        theme.spacing.xs,
    },
  });