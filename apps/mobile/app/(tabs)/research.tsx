import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ResearchCandidateCard } from "@/components/research/research-candidate-card";
import { useResearchAgent } from "@/hooks/use-research-agent";
import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";

export default function ResearchScreen() {
  const { settings, t } = useAppSettings();
  const {
    research,
    isLoading,
    isResearching,
    activeCandidateId,
    error,
    run,
    dismiss,
    save,
  } = useResearchAgent();
  const candidates = research?.candidates.filter(
    (candidate) => candidate.status === "suggested",
  ) ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isResearching}
          onRefresh={() => {
            if (settings.ai.autonomousResearch) void run();
          }}
        />
      }
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t("research.eyebrow")}</Text>
        <Text style={styles.title}>{t("research.title")}</Text>
        <Text style={styles.subtitle}>
          {t("research.subtitle")}
        </Text>
      </View>

      <Pressable
        disabled={isResearching || !settings.ai.autonomousResearch}
        onPress={() => void run()}
        style={({ pressed }) => [
          styles.runButton,
          pressed && styles.pressed,
        ]}
      >
        {isResearching ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons color="#ffffff" name="telescope" size={20} />
            <Text style={styles.runButtonText}>{t("research.run")}</Text>
          </>
        )}
      </Pressable>

      {!settings.ai.autonomousResearch ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>{t("research.disabled")}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>{error}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      ) : null}

      {research && research.interests.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("research.interests")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {research.interests.map((interest) => (
              <View key={interest.id} style={styles.interestCard}>
                <Text style={styles.interestTitle}>{interest.title}</Text>
                <Text style={styles.interestStrength}>
                  {Math.round(interest.strength * 100)}% · {interest.discoveryCount} {t("research.entries")}
                </Text>
                {interest.knowledgeGaps.slice(0, 3).map((gap) => (
                  <Text key={gap} style={styles.gap}>• {gap}</Text>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("research.inbox")}</Text>
          <Text style={styles.count}>{candidates.length}</Text>
        </View>

        {candidates.length > 0 ? (
          <View style={styles.candidateList}>
            {candidates.map((candidate) => (
              <ResearchCandidateCard
                candidate={candidate}
                isBusy={activeCandidateId === candidate.id}
                key={candidate.id}
                onDismiss={(id) => void dismiss(id)}
                onSave={(id) => void save(id)}
              />
            ))}
          </View>
        ) : !isLoading ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>{t("research.noSuggestions")}</Text>
            <Text style={styles.messageText}>
              {t("research.noSuggestionsText")}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.background },
  content: { paddingBottom: theme.spacing.xxxl, paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xxxl },
  header: { marginBottom: theme.spacing.xxl },
  eyebrow: { ...theme.typography.caption, color: theme.colors.primary, letterSpacing: 1.2 },
  title: { ...theme.typography.screenTitle, color: theme.colors.text, marginTop: theme.spacing.sm },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 22, marginTop: theme.spacing.sm },
  runButton: { alignItems: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg, flexDirection: "row", gap: theme.spacing.sm, justifyContent: "center", minHeight: 54 },
  runButtonText: { ...theme.typography.bodyStrong, color: "#ffffff" },
  pressed: { opacity: 0.72 },
  loading: { padding: theme.spacing.xxxl },
  section: { marginTop: theme.spacing.xxxl },
  sectionLabel: { ...theme.typography.caption, color: theme.colors.primary, letterSpacing: 1, marginBottom: theme.spacing.md },
  interestCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, marginRight: theme.spacing.md, padding: theme.spacing.lg, width: 240 },
  interestTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
  interestStrength: { ...theme.typography.caption, color: theme.colors.primary, marginTop: theme.spacing.xs },
  gap: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: theme.spacing.lg },
  sectionTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
  count: { ...theme.typography.caption, color: theme.colors.textSecondary },
  candidateList: { gap: theme.spacing.md },
  messageCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, marginTop: theme.spacing.lg, padding: theme.spacing.lg },
  messageTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
  messageText: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 21, marginTop: theme.spacing.xs },
});
