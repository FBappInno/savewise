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
  const briefing = research?.briefings?.[0];
  const insights = research?.insights?.slice(0, 5) ?? [];

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

      {briefing ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("research.dailyBriefing")}</Text>
          <View style={styles.briefingCard}>
            <View style={styles.briefingHeader}>
              <View style={styles.briefingIcon}>
                <Ionicons color={theme.colors.primary} name="sunny-outline" size={22} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.messageTitle}>{briefing.title}</Text>
                <Text style={styles.briefingDate}>{briefing.date}</Text>
              </View>
            </View>
            <Text style={styles.messageText}>{briefing.summary}</Text>
            <View style={styles.metricsGrid}>
              <Metric value={briefing.counts.totalFound} label={t("research.found")} />
              <Metric value={briefing.counts.papers + briefing.counts.studies} label={t("research.science")} />
              <Metric value={briefing.counts.videos} label={t("research.videos")} />
              <Metric value={briefing.counts.startups} label={t("research.startups")} />
              <Metric value={briefing.counts.trends} label={t("research.trends")} />
              <Metric value={briefing.counts.knowledgeGaps} label={t("research.gaps")} />
            </View>
            {briefing.counts.discarded > 0 ? (
              <Text style={styles.discarded}>
                {briefing.counts.discarded} {t("research.discarded")}
              </Text>
            ) : null}
          </View>
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
                <View style={styles.trendRow}>
                  <Ionicons
                    color={getTrendColor(interest.trend)}
                    name={getTrendIcon(interest.trend)}
                    size={15}
                  />
                  <Text style={[styles.trend, { color: getTrendColor(interest.trend) }]}>
                    {t(`research.trend.${interest.trend}`)}
                  </Text>
                </View>
                <Text style={styles.trendExplanation}>{interest.trendExplanation}</Text>
                {interest.knowledgeGaps.slice(0, 3).map((gap) => (
                  <Text key={gap} style={styles.gap}>• {gap}</Text>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {insights.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("research.newInsights")}</Text>
          <View style={styles.insightList}>
            {insights.map((insight) => (
              <View key={insight.id} style={styles.insightCard}>
                <Ionicons
                  color={theme.colors.primary}
                  name={getInsightIcon(insight.kind)}
                  size={20}
                />
                <View style={styles.flex}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightText}>{insight.description}</Text>
                </View>
              </View>
            ))}
          </View>
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

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getTrendIcon(trend: string): keyof typeof Ionicons.glyphMap {
  if (trend === "rising") return "trending-up";
  if (trend === "declining") return "trending-down";
  if (trend === "new") return "sparkles-outline";
  if (trend === "long-term") return "time-outline";
  return "remove-outline";
}

function getTrendColor(trend: string): string {
  if (trend === "rising" || trend === "new") return "#147D64";
  if (trend === "declining") return "#B45B35";
  return theme.colors.textSecondary;
}

function getInsightIcon(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind === "contradiction") return "git-compare-outline";
  if (kind === "confirmation") return "checkmark-circle-outline";
  if (kind === "knowledge-gap") return "search-outline";
  return "trending-up-outline";
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
  flex: { flex: 1 },
  section: { marginTop: theme.spacing.xxxl },
  sectionLabel: { ...theme.typography.caption, color: theme.colors.primary, letterSpacing: 1, marginBottom: theme.spacing.md },
  interestCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, marginRight: theme.spacing.md, padding: theme.spacing.lg, width: 240 },
  interestTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
  interestStrength: { ...theme.typography.caption, color: theme.colors.primary, marginTop: theme.spacing.xs },
  trendRow: { alignItems: "center", flexDirection: "row", gap: theme.spacing.xs, marginTop: theme.spacing.md },
  trend: { ...theme.typography.caption, fontWeight: "700" },
  trendExplanation: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18, marginTop: theme.spacing.xs },
  gap: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: theme.spacing.lg },
  sectionTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
  count: { ...theme.typography.caption, color: theme.colors.textSecondary },
  candidateList: { gap: theme.spacing.md },
  messageCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, marginTop: theme.spacing.lg, padding: theme.spacing.lg },
  messageTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
  messageText: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 21, marginTop: theme.spacing.xs },
  briefingCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, padding: theme.spacing.lg },
  briefingHeader: { alignItems: "center", flexDirection: "row", gap: theme.spacing.md },
  briefingIcon: { alignItems: "center", backgroundColor: theme.colors.background, borderRadius: 999, height: 44, justifyContent: "center", width: 44 },
  briefingDate: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  metric: { backgroundColor: theme.colors.background, borderRadius: theme.radius.md, minWidth: "30%", padding: theme.spacing.md },
  metricValue: { ...theme.typography.sectionTitle, color: theme.colors.text },
  metricLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  discarded: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  insightList: { gap: theme.spacing.sm },
  insightCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, flexDirection: "row", gap: theme.spacing.md, padding: theme.spacing.lg },
  insightTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  insightText: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18, marginTop: theme.spacing.xs },
});
