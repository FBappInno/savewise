import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { TopicBadge } from "@/components/topic-badge";
import { theme } from "@/theme";
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
  tiktok: "TikTok",
  web: "Web",
};

export function DiscoveryCard({
  discovery,
  onPress,
}: DiscoveryCardProps) {
  const classification =
    discovery.classification;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        `Open ${discovery.title}`
      }
      onPress={() =>
        onPress?.(discovery)
      }
      style={({ pressed }) => [
        styles.card,

        pressed &&
          styles.pressed,
      ]}
    >
      <Text style={styles.source}>
        {
          sourceLabels[
            discovery.source
          ]
        }
      </Text>

      <Text style={styles.title}>
        {discovery.title}
      </Text>

      <Text style={styles.metadata}>
        {discovery.author
          ? `${discovery.author} · `
          : ""}

        {discovery.savedAtLabel}
      </Text>

      {classification && (
        <View
          style={
            styles.classification
          }
        >
          <Text
            style={
              styles.classificationLabel
            }
          >
            Knowledge path
          </Text>

          <Text
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
            {
              classification.topic
            }
          </Text>
        </View>
      )}

      {discovery.summary && (
        <Text
          numberOfLines={3}
          style={styles.summary}
        >
          {discovery.summary}
        </Text>
      )}

      {discovery.topics.length >
        0 && (
        <View style={styles.topics}>
          {discovery.topics.map(
            (topic) => (
              <TopicBadge
                key={
                  `${discovery.id}-${topic}`
                }
                label={topic}
              />
            ),
          )}
        </View>
      )}
    </Pressable>
  );
}

function formatCategory(
  category: string,
) {
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

    padding:
      theme.spacing.lg,
  },

  pressed: {
    opacity: 0.75,
  },

  source: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    marginBottom:
      theme.spacing.xs,
  },

  title: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,
  },

  metadata: {
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
      theme.spacing.lg,

    padding:
      theme.spacing.md,
  },

  classificationLabel: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },

  classificationPath: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.text,

    marginTop:
      theme.spacing.xs,
  },

  summary: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.lg,
  },

  topics: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.sm,

    marginTop:
      theme.spacing.lg,
  },
});