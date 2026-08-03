import { Ionicons } from "@expo/vector-icons";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@/theme";

type LibraryOverviewProps = {
  discoveries: number;
  domains: number;
  knowledgeNodes: number;
  connections: number;

  onOpenDiscoveries: () => void;
  onOpenTree: () => void;
  onOpenConnections: () => void;
};

export function LibraryOverview({
  discoveries,
  domains,
  knowledgeNodes,
  connections,
  onOpenDiscoveries,
  onOpenTree,
  onOpenConnections,
}: LibraryOverviewProps) {
  return (
    <View style={styles.container}>
      <OverviewCard
        icon="documents-outline"
        label="Discoveries"
        onPress={onOpenDiscoveries}
        value={discoveries}
      />

      <OverviewCard
        icon="library-outline"
        label="Domains"
        onPress={onOpenTree}
        value={domains}
      />

      <OverviewCard
        icon="git-network-outline"
        label="Knowledge nodes"
        onPress={onOpenTree}
        value={knowledgeNodes}
      />

      <OverviewCard
        icon="share-social-outline"
        label="Connections"
        onPress={onOpenConnections}
        value={connections}
      />
    </View>
  );
}

type OverviewCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  onPress: () => void;
};

function OverviewCard({
  icon,
  label,
  value,
  onPress,
}: OverviewCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          color={theme.colors.primary}
          name={icon}
          size={19}
        />
      </View>

      <Text style={styles.value}>
        {value}
      </Text>

      <Text style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },

  card: {
    alignItems: "center",

    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    minHeight: 118,

    justifyContent: "center",

    paddingHorizontal:
      theme.spacing.md,

    paddingVertical:
      theme.spacing.lg,

    width: "47%",
  },

  iconContainer: {
    alignItems: "center",

    backgroundColor:
      theme.colors.background,

    borderRadius: 999,

    height: 34,

    justifyContent: "center",

    width: 34,
  },

  value: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,

    marginTop:
      theme.spacing.sm,
  },

  label: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.xs,

    textAlign: "center",
  },

  pressed: {
    opacity: 0.7,
  },
});