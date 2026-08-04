import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { TopicBadge } from "@/components/topic-badge";
import { theme } from "@/theme";
import { useAppSettings } from "@/providers/app-settings-provider";
import { formatAppDate } from "@/i18n/date-time";
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
  tiktok: "TikTok",
  web: "Web",
};

export function DiscoveryCard({
  discovery,
  onPress,
}: DiscoveryCardProps) {
  const { locale, settings } = useAppSettings();
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${displayedTitle}`}
      onPress={() => {
        onPress?.(discovery);
      }}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={styles.source}>
          {sourceLabels[discovery.source]}
        </Text>

        <Text style={styles.savedAt}>
          {formatAppDate(
            discovery.createdAt,
            locale,
            settings.dateTime.dateFormat,
          )}
        </Text>
      </View>

      <Text
        numberOfLines={2}
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
        <View
          style={
            styles.classification
          }
        >
          <Text
            numberOfLines={1}
            style={
              styles.classificationPath
            }
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
          numberOfLines={2}
          style={styles.summary}
        >
          {discovery.summary}
        </Text>
      ) : null}

      {visibleTopics.length > 0 ? (
        <View style={styles.topics}>
          {visibleTopics.map(
            (topic) => (
              <TopicBadge
                key={`${discovery.id}-${topic}`}
                label={topic}
              />
            ),
          )}

          {hiddenTopicCount > 0 ? (
            <View
              style={
                styles.moreTopicsBadge
              }
            >
              <Text
                style={
                  styles.moreTopicsText
                }
              >
                +{hiddenTopicCount}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
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
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    paddingHorizontal:
      theme.spacing.lg,

    paddingVertical:
      theme.spacing.md,
  },

  pressed: {
    opacity: 0.75,
  },

  topRow: {
    alignItems: "center",

    flexDirection: "row",

    justifyContent:
      "space-between",

    marginBottom:
      theme.spacing.xs,
  },

  source: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,
  },

  savedAt: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",

    color:
      theme.colors.text,

    lineHeight: 23,
  },

  author: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.xs,
  },

  classification: {
    backgroundColor:
      theme.colors.background,

    borderRadius:
      theme.radius.md,

    marginTop:
      theme.spacing.md,

    paddingHorizontal:
      theme.spacing.md,

    paddingVertical:
      theme.spacing.sm,
  },

  classificationPath: {
    ...theme.typography.caption,

    color:
      theme.colors.text,
  },

  summary: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    lineHeight: 19,

    marginTop:
      theme.spacing.md,
  },

  topics: {
    alignItems: "center",

    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.xs,

    marginTop:
      theme.spacing.md,
  },

  moreTopicsBadge: {
    alignItems: "center",

    backgroundColor:
      theme.colors.background,

    borderColor:
      theme.colors.border,

    borderRadius: 999,

    borderWidth: 1,

    justifyContent: "center",

    minHeight: 26,

    paddingHorizontal:
      theme.spacing.sm,
  },

  moreTopicsText: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },
});
