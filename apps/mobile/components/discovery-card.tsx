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

const MAX_VISIBLE_TOPICS = 3;

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

  const classification =
    discovery.classification;

  const visibleTopics =
    discovery.topics.slice(
      0,
      MAX_VISIBLE_TOPICS,
    );

  const hiddenTopicCount =
    Math.max(
      0,
      discovery.topics.length -
        visibleTopics.length,
    );

  const displayedTitle =
    discovery.improvedTitle ||
    discovery.title;

  const confidence =
    typeof discovery.confidence ===
      "number"
      ? Math.round(
          discovery.confidence * 100,
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

      {classification ? (
        <View style={styles.pathPanel}>
          <Ionicons
            color={
              universeTheme.colors
                .primary
            }
            name="git-network-outline"
            size={15}
          />

          <Text
            numberOfLines={2}
            style={styles.pathText}
          >
            {formatCategory(
              classification
                .primaryCategory,
            )}
            {"  ›  "}
            {
              classification
                .secondaryCategory
            }
            {"  ›  "}
            {classification.topic}
          </Text>
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

      {visibleTopics.length > 0 ? (
        <View style={styles.topics}>
          {visibleTopics.map(
            (topic) => (
              <View
                key={`${discovery.id}-${topic}`}
                style={styles.topicBadge}
              >
                <View
                  style={styles.topicDot}
                />

                <Text
                  numberOfLines={1}
                  style={
                    styles.topicText
                  }
                >
                  {topic}
                </Text>
              </View>
            ),
          )}

          {hiddenTopicCount > 0 ? (
            <View style={styles.moreBadge}>
              <Text
                style={
                  styles.moreBadgeText
                }
              >
                +{hiddenTopicCount}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Im Wissensuniversum öffnen
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

function formatCategory(
  category: string,
): string {
  return category
    .split("_")
    .map(
      (word) =>
        word.charAt(0)
          .toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    overflow: "hidden",

    padding: 18,

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.14,

    shadowRadius: 14,
  },

  glowLine: {
    backgroundColor:
      universeTheme.colors.primary,

    height: 2,

    left: 0,

    opacity: 0.75,

    position: "absolute",

    right: 0,

    top: 0,
  },

  pressed: {
    opacity: 0.72,

    transform: [
      {
        scale: 0.992,
      },
    ],
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

    gap: 10,
  },

  sourceIcon: {
    alignItems: "center",

    backgroundColor:
      "rgba(56, 189, 248, 0.11)",

    borderColor:
      universeTheme.colors.border,

    borderRadius: 12,

    borderWidth: 1,

    height: 38,

    justifyContent: "center",

    width: 38,
  },

  source: {
    color:
      universeTheme.colors
        .primaryBright,

    fontSize: 11,

    fontWeight: "800",

    letterSpacing: 0.8,

    textTransform: "uppercase",
  },

  savedAt: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 10,

    marginTop: 2,
  },

  confidenceBadge: {
    alignItems: "center",

    backgroundColor:
      "rgba(74, 222, 128, 0.08)",

    borderColor:
      "rgba(74, 222, 128, 0.28)",

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

    fontSize: 10,

    fontWeight: "800",
  },

  title: {
    color:
      universeTheme.colors.text,

    fontSize: 18,

    fontWeight: "800",

    lineHeight: 24,

    marginTop: 16,
  },

  author: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 12,

    marginTop: 6,
  },

  pathPanel: {
    alignItems: "flex-start",

    backgroundColor:
      "rgba(56, 189, 248, 0.06)",

    borderColor:
      universeTheme.colors.border,

    borderRadius: 13,

    borderWidth: 1,

    flexDirection: "row",

    gap: 8,

    marginTop: 15,

    padding: 12,
  },

  pathText: {
    color:
      universeTheme.colors
        .textSecondary,

    flex: 1,

    fontSize: 11,

    fontWeight: "600",

    lineHeight: 16,
  },

  summary: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 13,

    lineHeight: 20,

    marginTop: 14,
  },

  topics: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap: 7,

    marginTop: 15,
  },

  topicBadge: {
    alignItems: "center",

    backgroundColor:
      "rgba(139, 92, 246, 0.08)",

    borderColor:
      "rgba(139, 92, 246, 0.28)",

    borderRadius: 999,

    borderWidth: 1,

    flexDirection: "row",

    gap: 6,

    maxWidth: "100%",

    paddingHorizontal: 10,

    paddingVertical: 6,
  },

  topicDot: {
    backgroundColor:
      universeTheme.colors.violet,

    borderRadius: 999,

    height: 5,

    width: 5,
  },

  topicText: {
    color:
      universeTheme.colors
        .textSecondary,

    flexShrink: 1,

    fontSize: 10,

    fontWeight: "700",
  },

  moreBadge: {
    alignItems: "center",

    borderColor:
      universeTheme.colors.border,

    borderRadius: 999,

    borderWidth: 1,

    justifyContent: "center",

    minHeight: 29,

    paddingHorizontal: 10,
  },

  moreBadgeText: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 10,

    fontWeight: "700",
  },

  footer: {
    alignItems: "center",

    borderTopColor:
      universeTheme.colors.border,

    borderTopWidth: 1,

    flexDirection: "row",

    justifyContent:
      "space-between",

    marginTop: 17,

    paddingTop: 13,
  },

  footerText: {
    color:
      universeTheme.colors
        .primaryBright,

    fontSize: 11,

    fontWeight: "700",
  },
});
