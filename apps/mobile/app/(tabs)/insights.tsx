import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { InsightCard } from "@/components/insight-card";
import { useKnowledgeLibrary } from "@/hooks/use-knowledge-library";
import { theme } from "@/theme";

export default function InsightsScreen() {
  const {
    library,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useKnowledgeLibrary();

  return (
    <ScrollView
      contentContainerStyle={
        styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            void refresh();
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
          PERSONAL INTELLIGENCE
        </Text>

        <Text style={styles.title}>
          Insights
        </Text>

        <Text style={styles.subtitle}>
          Patterns and opportunities
          detected across your saved
          discoveries.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />

          <Text style={styles.loadingText}>
            Analyzing your knowledge...
          </Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>
            Insights unavailable
          </Text>

          <Text style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : null}

      {!isLoading &&
      library &&
      !error ? (
        <>
          <View style={styles.activityGrid}>
            <ActivityCard
              label="Total"
              value={
                library.activity
                  .totalDiscoveries
              }
            />

            <ActivityCard
              label="Last 7 days"
              value={
                library.activity
                  .last7Days
              }
            />

            <ActivityCard
              label="Last 30 days"
              value={
                library.activity
                  .last30Days
              }
            />

            <ActivityCard
              label="New topics"
              value={
                library.activity
                  .newTopicsLast30Days
              }
            />
          </View>

          <View style={styles.section}>
            <Text
              style={styles.sectionTitle}
            >
              What SaveWise noticed
            </Text>

            {library.insights.length >
            0 ? (
              <View
                style={
                  styles.insightList
                }
              >
                {library.insights.map(
                  (insight) => (
                    <InsightCard
                      insight={insight}
                      key={insight.id}
                    />
                  ),
                )}
              </View>
            ) : (
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
                  Not enough data yet
                </Text>

                <Text
                  style={
                    styles.messageText
                  }
                >
                  Add more discoveries
                  so SaveWise can detect
                  meaningful patterns.
                </Text>
              </View>
            )}
          </View>

          {library.interests.length >
          0 ? (
            <View style={styles.section}>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Strongest interests
              </Text>

              <View
                style={
                  styles.interestList
                }
              >
                {library.interests
                  .slice(0, 5)
                  .map(
                    (
                      interest,
                      index,
                    ) => (
                      <View
                        key={
                          interest.id
                        }
                        style={
                          styles.interestRow
                        }
                      >
                        <Text
                          style={
                            styles.interestRank
                          }
                        >
                          {index + 1}
                        </Text>

                        <View
                          style={
                            styles.interestContent
                          }
                        >
                          <View
                            style={
                              styles.interestHeader
                            }
                          >
                            <Text
                              style={
                                styles.interestName
                              }
                            >
                              {
                                interest.name
                              }
                            </Text>

                            <Text
                              style={
                                styles.interestCount
                              }
                            >
                              {
                                interest.discoveries
                              }
                            </Text>
                          </View>

                          <View
                            style={
                              styles.progressTrack
                            }
                          >
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${Math.round(
                                    interest.score *
                                      100,
                                  )}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    ),
                  )}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

type ActivityCardProps = {
  label: string;
  value: number;
};

function ActivityCard({
  label,
  value,
}: ActivityCardProps) {
  return (
    <View style={styles.activityCard}>
      <Text style={styles.activityValue}>
        {value}
      </Text>

      <Text style={styles.activityLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
      theme.spacing.xxxl,
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
    ...theme.typography.screenTitle,

    color:
      theme.colors.text,

    marginTop:
      theme.spacing.sm,
  },

  subtitle: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    lineHeight: 22,

    marginTop:
      theme.spacing.sm,
  },

  centered: {
    alignItems: "center",

    paddingVertical:
      theme.spacing.xxxl,
  },

  loadingText: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.md,
  },

  activityGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.md,
  },

  activityCard: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    padding:
      theme.spacing.lg,

    width: "47%",
  },

  activityValue: {
    ...theme.typography.screenTitle,

    color:
      theme.colors.text,
  },

  activityLabel: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.xs,
  },

  section: {
    marginTop:
      theme.spacing.xxxl,
  },

  sectionTitle: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,

    marginBottom:
      theme.spacing.lg,
  },

  insightList: {
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

    padding:
      theme.spacing.lg,
  },

  messageTitle: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,
  },

  messageText: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.sm,
  },

  interestList: {
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

  interestRow: {
    alignItems: "center",

    flexDirection: "row",

    marginBottom:
      theme.spacing.lg,
  },

  interestRank: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.primary,

    marginRight:
      theme.spacing.md,

    textAlign: "center",

    width: 22,
  },

  interestContent: {
    flex: 1,
  },

  interestHeader: {
    flexDirection: "row",

    justifyContent:
      "space-between",
  },

  interestName: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.text,

    flex: 1,
  },

  interestCount: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    marginLeft:
      theme.spacing.sm,
  },

  progressTrack: {
    backgroundColor:
      theme.colors.background,

    borderRadius: 999,

    height: 6,

    marginTop:
      theme.spacing.sm,

    overflow: "hidden",
  },

  progressFill: {
    backgroundColor:
      theme.colors.primary,

    borderRadius: 999,

    height: "100%",
  },
});