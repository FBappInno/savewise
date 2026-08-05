import { Ionicons } from "@expo/vector-icons";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  ResearchCandidate,
} from "@savewise/shared";

import { useAppSettings } from "@/providers/app-settings-provider";
import { universeTheme } from "@/theme/universe-theme";

type Props = {
  candidate: ResearchCandidate;
  isBusy: boolean;
  onDismiss: (
    candidateId: string,
  ) => void;
  onSave: (
    candidateId: string,
  ) => void;
};

export function ResearchCandidateCard({
  candidate,
  isBusy,
  onDismiss,
  onSave,
}: Props) {
  const { t } =
    useAppSettings();

  const matchScore =
    Math.round(
      candidate.scores.overall *
        100,
    );

  const scoreItems = [
    {
      label: "Relevanz",
      value:
        candidate.scores.relevance,
    },
    {
      label: "Qualität",
      value:
        candidate.scores.quality,
    },
    {
      label: "Vertrauen",
      value:
        candidate.scores
          .trustworthiness,
    },
    {
      label: "Wissenswert",
      value:
        candidate.scores
          .knowledgeValue,
    },
    {
      label: "Aktualität",
      value:
        candidate.scores.recency,
    },
    {
      label: "Wissenslücke",
      value:
        candidate.scores
          .gapCoverage,
    },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.topGlow} />

      <View style={styles.header}>
        <View
          style={styles.sourceBadge}
        >
          <Ionicons
            color={
              universeTheme.colors
                .primaryBright
            }
            name={getSourceIcon(
              candidate.sourceType,
            )}
            size={15}
          />

          <Text
            style={
              styles.sourceBadgeText
            }
          >
            {formatLabel(
              candidate.sourceType,
            )}
          </Text>
        </View>

        <View
          style={
            styles.matchBadge
          }
        >
          <Text
            style={
              styles.matchValue
            }
          >
            {matchScore} %
          </Text>

          <Text
            style={
              styles.matchLabel
            }
          >
            MATCH
          </Text>
        </View>
      </View>

      <Text
        numberOfLines={3}
        style={styles.title}
      >
        {candidate.title}
      </Text>

      <View style={styles.sourceRow}>
        <Ionicons
          color={
            universeTheme.colors
              .textMuted
          }
          name="radio-outline"
          size={14}
        />

        <Text
          numberOfLines={1}
          style={styles.source}
        >
          {candidate.sourceName}
        </Text>
      </View>

      <Text style={styles.summary}>
        {candidate.summary}
      </Text>

      <View style={styles.scoreGrid}>
        {scoreItems.map(
          (item) => (
            <ScoreMetric
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ),
        )}
      </View>

      <View
        style={[
          styles.impactCard,
          {
            borderColor:
              getImpactColor(
                candidate.impact,
              ),
          },
        ]}
      >
        <View
          style={[
            styles.impactIcon,
            {
              backgroundColor:
                `${getImpactColor(
                  candidate.impact,
                )}18`,
            },
          ]}
        >
          <Ionicons
            color={getImpactColor(
              candidate.impact,
            )}
            name={getImpactIcon(
              candidate.impact,
            )}
            size={19}
          />
        </View>

        <View style={styles.flex}>
          <Text
            style={
              styles.impactEyebrow
            }
          >
            KNOWLEDGE IMPACT
          </Text>

          <Text
            style={
              styles.impactTitle
            }
          >
            {t(
              `research.impact.${candidate.impact}`,
            )}
          </Text>

          <Text
            style={
              styles.impactText
            }
          >
            {
              candidate.impactExplanation
            }
          </Text>
        </View>
      </View>

      <View style={styles.reasonCard}>
        <Ionicons
          color={
            universeTheme.colors
              .violet
          }
          name="sparkles-outline"
          size={17}
        />

        <Text style={styles.reason}>
          {candidate.decisionReason}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() =>
            onDismiss(candidate.id)
          }
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed &&
              styles.pressed,
            isBusy &&
              styles.disabled,
          ]}
        >
          <Ionicons
            color={
              universeTheme.colors
                .textSecondary
            }
            name="close-outline"
            size={18}
          />

          <Text
            style={
              styles.secondaryButtonText
            }
          >
            {t("research.dismiss")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() =>
            onSave(candidate.id)
          }
          style={({ pressed }) => [
            styles.primaryButton,
            pressed &&
              styles.pressed,
            isBusy &&
              styles.disabled,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator
              color="#03111E"
              size="small"
            />
          ) : (
            <>
              <Ionicons
                color="#03111E"
                name="bookmark-outline"
                size={18}
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {t("research.save")}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ScoreMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const percent =
    Math.round(value * 100);

  return (
    <View style={styles.scoreCard}>
      <View
        style={
          styles.scoreCardHeader
        }
      >
        <Text
          style={
            styles.scoreValue
          }
        >
          {percent} %
        </Text>

        <View
          style={
            styles.scorePulse
          }
        />
      </View>

      <Text
        style={
          styles.scoreLabel
        }
      >
        {label}
      </Text>

      <View
        style={
          styles.progressTrack
        }
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${percent}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

function formatLabel(
  value: string,
): string {
  return value
    .split("-")
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}

function getSourceIcon(
  sourceType: string,
): keyof typeof Ionicons.glyphMap {
  if (
    sourceType === "paper" ||
    sourceType === "study" ||
    sourceType ===
      "whitepaper"
  ) {
    return "flask-outline";
  }

  if (
    sourceType === "video" ||
    sourceType === "podcast"
  ) {
    return "videocam-outline";
  }

  if (
    sourceType === "startup" ||
    sourceType === "company"
  ) {
    return "rocket-outline";
  }

  if (
    sourceType === "news"
  ) {
    return "newspaper-outline";
  }

  return "globe-outline";
}

function getImpactIcon(
  impact:
    ResearchCandidate["impact"],
): keyof typeof Ionicons.glyphMap {
  if (
    impact === "contradicts"
  ) {
    return "git-compare-outline";
  }

  if (
    impact === "confirms"
  ) {
    return "checkmark-circle-outline";
  }

  return "add-circle-outline";
}

function getImpactColor(
  impact:
    ResearchCandidate["impact"],
): string {
  if (
    impact === "contradicts"
  ) {
    return universeTheme.colors
      .orange;
  }

  if (
    impact === "confirms"
  ) {
    return universeTheme.colors
      .green;
  }

  return universeTheme.colors
    .violet;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:
      "rgba(6, 20, 36, 0.96)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    overflow: "hidden",

    padding: 17,

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.14,

    shadowRadius: 15,
  },

  topGlow: {
    backgroundColor:
      universeTheme.colors.primary,

    height: 2,

    left: 0,

    opacity: 0.8,

    position: "absolute",

    right: 0,

    top: 0,
  },

  header: {
    alignItems: "center",

    flexDirection: "row",

    justifyContent:
      "space-between",
  },

  sourceBadge: {
    alignItems: "center",

    backgroundColor:
      "rgba(56, 189, 248, 0.08)",

    borderColor:
      universeTheme.colors.border,

    borderRadius: 999,

    borderWidth: 1,

    flexDirection: "row",

    gap: 6,

    paddingHorizontal: 10,

    paddingVertical: 7,
  },

  sourceBadgeText: {
    color:
      universeTheme.colors
        .primaryBright,

    fontSize: 9,

    fontWeight: "900",

    letterSpacing: 0.7,

    textTransform: "uppercase",
  },

  matchBadge: {
    alignItems: "flex-end",
  },

  matchValue: {
    color:
      universeTheme.colors
        .primaryBright,

    fontSize: 18,

    fontWeight: "900",
  },

  matchLabel: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 8,

    fontWeight: "800",

    letterSpacing: 1,
  },

  title: {
    color:
      universeTheme.colors.text,

    fontSize: 19,

    fontWeight: "900",

    lineHeight: 25,

    marginTop: 16,
  },

  sourceRow: {
    alignItems: "center",

    flexDirection: "row",

    gap: 6,

    marginTop: 7,
  },

  source: {
    color:
      universeTheme.colors
        .textMuted,

    flex: 1,

    fontSize: 11,

    fontWeight: "600",
  },

  summary: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 13,

    lineHeight: 20,

    marginTop: 15,
  },

  scoreGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap: 8,

    marginTop: 16,
  },

  scoreCard: {
    backgroundColor:
      "rgba(3, 12, 24, 0.72)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.md,

    borderWidth: 1,

    padding: 11,

    width: "48.7%",
  },

  scoreCardHeader: {
    alignItems: "center",

    flexDirection: "row",

    justifyContent:
      "space-between",
  },

  scoreValue: {
    color:
      universeTheme.colors
        .primaryBright,

    fontSize: 15,

    fontWeight: "900",
  },

  scorePulse: {
    backgroundColor:
      universeTheme.colors.green,

    borderRadius: 999,

    height: 6,

    shadowColor:
      universeTheme.colors.green,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.8,

    shadowRadius: 5,

    width: 6,
  },

  scoreLabel: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 9,

    fontWeight: "700",

    marginTop: 3,
  },

  progressTrack: {
    backgroundColor:
      "rgba(148, 163, 184, 0.11)",

    borderRadius: 999,

    height: 4,

    marginTop: 8,

    overflow: "hidden",
  },

  progressFill: {
    backgroundColor:
      universeTheme.colors.primary,

    borderRadius: 999,

    height: 4,
  },

  impactCard: {
    alignItems: "flex-start",

    backgroundColor:
      "rgba(3, 12, 24, 0.7)",

    borderRadius:
      universeTheme.radius.md,

    borderWidth: 1,

    flexDirection: "row",

    gap: 11,

    marginTop: 16,

    padding: 13,
  },

  impactIcon: {
    alignItems: "center",

    borderRadius: 11,

    height: 38,

    justifyContent: "center",

    width: 38,
  },

  flex: {
    flex: 1,
  },

  impactEyebrow: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 8,

    fontWeight: "800",

    letterSpacing: 0.8,
  },

  impactTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 13,

    fontWeight: "900",

    marginTop: 2,
  },

  impactText: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 11,

    lineHeight: 17,

    marginTop: 4,
  },

  reasonCard: {
    alignItems: "flex-start",

    backgroundColor:
      "rgba(139, 92, 246, 0.05)",

    borderColor:
      "rgba(139, 92, 246, 0.18)",

    borderRadius:
      universeTheme.radius.md,

    borderWidth: 1,

    flexDirection: "row",

    gap: 9,

    marginTop: 13,

    padding: 12,
  },

  reason: {
    color:
      universeTheme.colors
        .textSecondary,

    flex: 1,

    fontSize: 11,

    fontStyle: "italic",

    lineHeight: 17,
  },

  actions: {
    flexDirection: "row",

    gap: 9,

    marginTop: 17,
  },

  secondaryButton: {
    alignItems: "center",

    backgroundColor:
      "rgba(148, 163, 184, 0.05)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.md,

    borderWidth: 1,

    flex: 1,

    flexDirection: "row",

    gap: 7,

    justifyContent: "center",

    minHeight: 48,
  },

  secondaryButtonText: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 12,

    fontWeight: "800",
  },

  primaryButton: {
    alignItems: "center",

    backgroundColor:
      universeTheme.colors
        .primaryBright,

    borderColor:
      universeTheme.colors
        .primaryBright,

    borderRadius:
      universeTheme.radius.md,

    borderWidth: 1,

    flex: 1,

    flexDirection: "row",

    gap: 7,

    justifyContent: "center",

    minHeight: 48,

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.38,

    shadowRadius: 12,
  },

  primaryButtonText: {
    color: "#03111E",

    fontSize: 12,

    fontWeight: "900",
  },

  pressed: {
    opacity: 0.7,

    transform: [
      {
        scale: 0.99,
      },
    ],
  },

  disabled: {
    opacity: 0.42,
  },
});