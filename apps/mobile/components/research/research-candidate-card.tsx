import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@/theme";
import type { ResearchCandidate } from "@savewise/shared";

type Props = {
  candidate: ResearchCandidate;
  isBusy: boolean;
  onDismiss: (candidateId: string) => void;
  onSave: (candidateId: string) => void;
};

export function ResearchCandidateCard({
  candidate,
  isBusy,
  onDismiss,
  onSave,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.sourceType}>
          <Text style={styles.sourceTypeText}>
            {formatLabel(candidate.sourceType)}
          </Text>
        </View>

        <Text style={styles.score}>
          {Math.round(candidate.scores.overall * 100)}% match
        </Text>
      </View>

      <Text style={styles.title}>{candidate.title}</Text>
      <Text style={styles.source}>{candidate.sourceName}</Text>
      <Text style={styles.summary}>{candidate.summary}</Text>

      <View style={styles.impactCard}>
        <Ionicons
          color={theme.colors.primary}
          name={getImpactIcon(candidate.impact)}
          size={18}
        />
        <View style={styles.flex}>
          <Text style={styles.impactTitle}>
            {formatLabel(candidate.impact)} your knowledge
          </Text>
          <Text style={styles.impactText}>
            {candidate.impactExplanation}
          </Text>
        </View>
      </View>

      <Text style={styles.reason}>{candidate.decisionReason}</Text>

      <View style={styles.actions}>
        <Pressable
          disabled={isBusy}
          onPress={() => onDismiss(candidate.id)}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Dismiss</Text>
        </Pressable>

        <Pressable
          disabled={isBusy}
          onPress={() => onSave(candidate.id)}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons color="#ffffff" name="bookmark-outline" size={17} />
              <Text style={styles.primaryButtonText}>Save</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getImpactIcon(
  impact: ResearchCandidate["impact"],
): keyof typeof Ionicons.glyphMap {
  return impact === "contradicts"
    ? "git-compare-outline"
    : impact === "confirms"
      ? "checkmark-circle-outline"
      : "add-circle-outline";
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, padding: theme.spacing.lg },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sourceType: { backgroundColor: theme.colors.background, borderRadius: 999, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  sourceTypeText: { ...theme.typography.caption, color: theme.colors.primary },
  score: { ...theme.typography.caption, color: theme.colors.textSecondary },
  title: { ...theme.typography.sectionTitle, color: theme.colors.text, marginTop: theme.spacing.md },
  source: { ...theme.typography.caption, color: theme.colors.primary, marginTop: theme.spacing.xs },
  summary: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 21, marginTop: theme.spacing.md },
  impactCard: { backgroundColor: theme.colors.background, borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md, padding: theme.spacing.md },
  flex: { flex: 1 },
  impactTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  impactText: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18, marginTop: theme.spacing.xs },
  reason: { ...theme.typography.caption, color: theme.colors.textSecondary, fontStyle: "italic", lineHeight: 18, marginTop: theme.spacing.md },
  actions: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  secondaryButton: { alignItems: "center", borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 46 },
  secondaryButtonText: { ...theme.typography.bodyStrong, color: theme.colors.textSecondary },
  primaryButton: { alignItems: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, flex: 1, flexDirection: "row", gap: theme.spacing.xs, justifyContent: "center", minHeight: 46 },
  primaryButtonText: { ...theme.typography.bodyStrong, color: "#ffffff" },
  pressed: { opacity: 0.72 },
});
