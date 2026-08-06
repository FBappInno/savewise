import { Ionicons } from "@expo/vector-icons";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { formatAppDate } from "@/i18n/date-time";
import { useAppSettings } from "@/providers/app-settings-provider";
import { universeTheme } from "@/theme/universe-theme";
import {
  getDiscoveryHierarchy,
} from "@/utils/knowledge-hierarchy";

import type {
  Discovery,
  DiscoverySource,
} from "@/types/discovery";

type DiscoveryCardProps = {
  discovery: Discovery;

  onPress?: (
    discovery: Discovery,
  ) => void;
};

const sourceLabels: Record<
  DiscoverySource,
  string
> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  web: "Web",
};

const sourceIcons: Record<
  DiscoverySource,
  keyof typeof Ionicons.glyphMap
> = {
  youtube: "logo-youtube",
  instagram: "logo-instagram",
  facebook: "logo-facebook",
  tiktok: "musical-notes-outline",
  web: "globe-outline",
};

export function DiscoveryCard({
  discovery,
  onPress,
}: DiscoveryCardProps) {
  const {
    locale,
    settings,
  } = useAppSettings();

  const hierarchy =
    getDiscoveryHierarchy(
      discovery,
    );

  const displayedTitle =
    discovery.improvedTitle ||
    discovery.title;

  const confidence =
    typeof discovery.confidence ===
    "number"
      ? Math.round(
          discovery.confidence *
            100,
        )
      : null;

  return (
    <Pressable
      accessibilityLabel={`Öffne ${displayedTitle}`}
      accessibilityRole="button"
      onPress={() => {
        onPress?.(discovery);
      }}
      style={({ pressed }) => [
        styles.card,

        pressed &&
          styles.pressed,
      ]}
    >
      <View style={styles.glowLine} />

      <View style={styles.topRow}>
        <View style={styles.sourceGroup}>
          <View style={styles.sourceIcon}>
            <Ionicons
              color={
                universeTheme.colors
                  .primaryBright
              }
              name={
                sourceIcons[
                  discovery.source
                ]
              }
              size={17}
            />
          </View>

          <View>
            <Text style={styles.source}>
              {
                sourceLabels[
                  discovery.source
                ]
              }
            </Text>

            <Text style={styles.savedAt}>
              {formatAppDate(
                discovery.createdAt,
                locale,
                settings.dateTime
                  .dateFormat,
              )}
            </Text>
          </View>
        </View>

        {confidence !== null ? (
          <View
            style={
              styles.confidenceBadge
            }
          >
            <Ionicons
              color={
                universeTheme.colors
                  .green
              }
              name="sparkles"
              size={12}
            />

            <Text
              style={
                styles.confidenceText
              }
            >
              {confidence} %
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        numberOfLines={3}
        style={styles.title}
      >
        {displayedTitle}
      </Text>

      {discovery.author ? (
        <Text
          numberOfLines={1}
          style={styles.author}
        >
          {discovery.author}
        </Text>
      ) : null}

      {hierarchy.domain ||
      hierarchy.topic ||
      hierarchy.subtopics.length >
        0 ? (
        <View style={styles.hierarchy}>
          {hierarchy.domain ? (
            <HierarchyRow
              icon="planet-outline"
              label="Domäne"
              value={
                hierarchy.domain
              }
            />
          ) : null}

          {hierarchy.topic ? (
            <HierarchyConnector />
          ) : null}

          {hierarchy.topic ? (
            <HierarchyRow
              icon="sunny-outline"
              label="Topic"
              value={
                hierarchy.topic
              }
            />
          ) : null}

          {hierarchy.subtopics.length >
          0 ? (
            <HierarchyConnector />
          ) : null}

          {hierarchy.subtopics.length >
          0 ? (
            <View
              style={
                styles.subtopicSection
              }
            >
              <View
                style={
                  styles.levelHeader
                }
              >
                <View
                  style={
                    styles.levelIcon
                  }
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors
                        .violet
                    }
                    name="star-outline"
                    size={15}
                  />
                </View>

                <Text
                  style={
                    styles.levelLabel
                  }
                >
                  Unterthema
                </Text>
              </View>

              <View
                style={
                  styles.subtopicChips
                }
              >
                {hierarchy.subtopics
                  .slice(0, 4)
                  .map(
                    (subtopic) => (
                      <View
                        key={subtopic}
                        style={
                          styles.subtopicChip
                        }
                      >
                        <Text
                          numberOfLines={
                            1
                          }
                          style={
                            styles.subtopicText
                          }
                        >
                          {subtopic}
                        </Text>
                      </View>
                    ),
                  )}

                {hierarchy.subtopics
                  .length > 4 ? (
                  <View
                    style={
                      styles.moreChip
                    }
                  >
                    <Text
                      style={
                        styles.moreText
                      }
                    >
                      +
                      {hierarchy
                        .subtopics
                        .length - 4}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {discovery.summary ? (
        <Text
          numberOfLines={3}
          style={styles.summary}
        >
          {discovery.summary}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Discovery öffnen
        </Text>

        <Ionicons
          color={
            universeTheme.colors
              .primaryBright
          }
          name="arrow-forward"
          size={17}
        />
      </View>
    </Pressable>
  );
}

function HierarchyRow({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  label: string;
  value: string;
}) {
  return (
    <View style={styles.hierarchyRow}>
      <View style={styles.levelHeader}>
        <View style={styles.levelIcon}>
          <Ionicons
            color={
              universeTheme.colors
                .primaryBright
            }
            name={icon}
            size={15}
          />
        </View>

        <Text style={styles.levelLabel}>
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={2}
        style={styles.levelValue}
      >
        {value}
      </Text>
    </View>
  );
}

function HierarchyConnector() {
  return (
    <View
      pointerEvents="none"
      style={
        styles.hierarchyConnector
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:
      "rgba(20, 48, 77, 0.92)",
    borderColor:
      "rgba(125, 211, 252, 0.24)",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    padding: 17,
  },

  glowLine: {
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    height: 2,
    left: 0,
    opacity: 0.75,
    position: "absolute",
    right: 0,
    top: 0,
  },

  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
  },

  sourceGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },

  sourceIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.12)",
    borderRadius: 11,
    height: 37,
    justifyContent: "center",
    width: 37,
  },

  source: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  savedAt: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 9,
    marginTop: 3,
  },

  confidenceBadge: {
    alignItems: "center",
    backgroundColor:
      "rgba(74, 222, 128, 0.09)",
    borderColor:
      "rgba(74, 222, 128, 0.26)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  confidenceText: {
    color:
      universeTheme.colors.green,
    fontSize: 9,
    fontWeight: "900",
  },

  title: {
    color:
      universeTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    marginTop: 14,
  },

  author: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 11,
    marginTop: 6,
  },

  hierarchy: {
    backgroundColor:
      "rgba(45, 76, 108, 0.63)",
    borderColor:
      "rgba(148, 197, 229, 0.20)",
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },

  hierarchyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent:
      "space-between",
    minHeight: 35,
  },

  levelHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },

  levelIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.09)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },

  levelLabel: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  levelValue: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    textAlign: "right",
  },

  hierarchyConnector: {
    backgroundColor:
      "rgba(125, 211, 252, 0.28)",
    height: 9,
    marginLeft: 13,
    width: 1,
  },

  subtopicSection: {
    gap: 8,
  },

  subtopicChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  subtopicChip: {
    backgroundColor:
      "rgba(139, 92, 246, 0.10)",
    borderColor:
      "rgba(167, 139, 250, 0.30)",
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  subtopicText: {
    color:
      universeTheme.colors
        .textSecondary,
    flexShrink: 1,
    fontSize: 9,
    fontWeight: "700",
  },

  moreChip: {
    alignItems: "center",
    borderColor:
      universeTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  moreText: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 9,
    fontWeight: "800",
  },

  summary: {
    color: "#D6E2EC",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 14,
  },

  footer: {
    alignItems: "center",
    borderTopColor:
      universeTheme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginTop: 15,
    paddingTop: 12,
  },

  footerText: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 10,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.66,
  },
});
