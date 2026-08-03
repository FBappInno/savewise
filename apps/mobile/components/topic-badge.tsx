import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme";

type TopicBadgeProps = {
  label: string;
};

export function TopicBadge({ label }: TopicBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },

  label: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});