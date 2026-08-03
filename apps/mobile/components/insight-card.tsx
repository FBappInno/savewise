import { Ionicons } from "@expo/vector-icons";

import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@/theme";
import type {
  Insight,
  InsightKind,
} from "@savewise/shared";

type InsightCardProps = {
  insight: Insight;
};

const insightConfiguration: Record<
  InsightKind,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  "dominant-interest": {
    label: "Top interest",
    icon: "star-outline",
  },

  "recent-activity": {
    label: "Activity",
    icon: "trending-up-outline",
  },

  "emerging-topic": {
    label: "Emerging topic",
    icon: "sparkles-outline",
  },

  "connected-topics": {
    label: "Connection",
    icon: "git-network-outline",
  },

  "knowledge-gap": {
    label: "Knowledge gap",
    icon: "compass-outline",
  },
};

export function InsightCard({
  insight,
}: InsightCardProps) {
  const configuration =
    insightConfiguration[
      insight.kind
    ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons
            color={theme.colors.primary}
            name={configuration.icon}
            size={18}
          />
        </View>

        <Text style={styles.label}>
          {configuration.label}
        </Text>

        <Text style={styles.score}>
          {Math.round(
            insight.score * 100,
          )}
          %
        </Text>
      </View>

      <Text style={styles.title}>
        {insight.title}
      </Text>

      <Text style={styles.description}>
        {insight.description}
      </Text>

      {insight.discoveryIds.length >
      0 ? (
        <Text style={styles.metadata}>
          {insight.discoveryIds.length}{" "}
          {insight.discoveryIds.length ===
          1
            ? "discovery"
            : "discoveries"}
        </Text>
      ) : null}
    </View>
  );
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

  header: {
    alignItems: "center",

    flexDirection: "row",

    marginBottom:
      theme.spacing.md,
  },

  iconContainer: {
    alignItems: "center",

    backgroundColor:
      theme.colors.background,

    borderRadius: 999,

    height: 34,

    justifyContent: "center",

    marginRight:
      theme.spacing.sm,

    width: 34,
  },

  label: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    flex: 1,

    textTransform: "uppercase",
  },

  score: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },

  title: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,
  },

  description: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    lineHeight: 21,

    marginTop:
      theme.spacing.sm,
  },

  metadata: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.md,
  },
});