import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { usePersonalIntelligence } from "@/hooks/use-personal-intelligence";
import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";
import type { WorkAssistantTaskType } from "@savewise/shared";

const TASKS: { type: WorkAssistantTaskType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: "meeting-brief", icon: "people-outline" },
  { type: "presentation", icon: "easel-outline" },
  { type: "project-summary", icon: "folder-open-outline" },
  { type: "learning-plan", icon: "school-outline" },
  { type: "talk-outline", icon: "mic-outline" },
  { type: "business-case", icon: "briefcase-outline" },
];

export function PersonalIntelligencePanel() {
  const { t } = useAppSettings();
  const { overview, workProduct, isLoading, isWorking, error, createWorkProduct } =
    usePersonalIntelligence();
  const [instruction, setInstruction] = useState("");
  const [includeResearch, setIncludeResearch] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{t("intelligence.eyebrow")}</Text>
      <Text style={styles.title}>{t("intelligence.title")}</Text>
      <Text style={styles.description}>{t("intelligence.description")}</Text>

      {isLoading ? <ActivityIndicator style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {overview ? (
        <>
          <View style={styles.versionCard}>
            <View style={styles.versionIcon}>
              <Ionicons color={theme.colors.primary} name="git-network-outline" size={22} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>
                {t("intelligence.modelVersion")} {overview.modelVersion}
              </Text>
              <Text style={styles.secondary}>
                {overview.latestLearningEvent?.explanation ?? t("intelligence.noLearningEvent")}
              </Text>
            </View>
          </View>

          {overview.predictions.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("intelligence.predictions")}</Text>
              {overview.predictions.slice(0, 4).map((prediction) => (
                <View key={prediction.id} style={styles.itemCard}>
                  <View style={styles.row}>
                    <Ionicons color={theme.colors.primary} name="telescope-outline" size={18} />
                    <Text style={styles.itemTitle}>{prediction.title}</Text>
                    <Text style={styles.confidence}>{Math.round(prediction.confidence * 100)}%</Text>
                  </View>
                  <Text style={styles.secondary}>{prediction.explanation}</Text>
                  {prediction.discoveryIds.length > 0 ? (
                    <Pressable
                      onPress={() => router.push(`/discovery/${prediction.discoveryIds[0]}`)}
                    >
                      <Text style={styles.evidence}>{prediction.discoveryIds.length} {t("intelligence.evidence")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {overview.recommendations.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t("intelligence.recommendations")}</Text>
              {overview.recommendations.slice(0, 5).map((recommendation) => (
                <Pressable
                  key={recommendation.id}
                  onPress={() => {
                    if (recommendation.url) void Linking.openURL(recommendation.url);
                    else if (recommendation.discoveryIds[0]) {
                      router.push(`/discovery/${recommendation.discoveryIds[0]}`);
                    }
                  }}
                  style={({ pressed }) => [styles.itemCard, pressed && styles.pressed]}
                >
                  <View style={styles.row}>
                    <Ionicons color={theme.colors.primary} name="bulb-outline" size={18} />
                    <Text style={styles.itemTitle}>{recommendation.title}</Text>
                    <Ionicons color={theme.colors.placeholder} name="chevron-forward" size={16} />
                  </View>
                  <Text style={styles.secondary}>{recommendation.description}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("intelligence.workAssistant")}</Text>
        <TextInput
          multiline
          onChangeText={setInstruction}
          placeholder={t("intelligence.workPlaceholder")}
          placeholderTextColor={theme.colors.placeholder}
          style={styles.input}
          value={instruction}
        />
        <View style={styles.researchRow}>
          <View style={styles.flex}>
            <Text style={styles.switchTitle}>{t("intelligence.includeResearch")}</Text>
            <Text style={styles.secondary}>{t("intelligence.includeResearchHint")}</Text>
          </View>
          <Switch onValueChange={setIncludeResearch} value={includeResearch} />
        </View>
        <View style={styles.taskGrid}>
          {TASKS.map(({ type, icon }) => (
            <Pressable
              disabled={isWorking || instruction.trim().length < 3}
              key={type}
              onPress={() => void createWorkProduct({
                type,
                instruction: instruction.trim(),
                includeVerifiedResearch: includeResearch,
              })}
              style={({ pressed }) => [
                styles.taskButton,
                instruction.trim().length < 3 && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons color={theme.colors.primary} name={icon} size={19} />
              <Text style={styles.taskText}>{t(`intelligence.task.${type}`)}</Text>
            </Pressable>
          ))}
        </View>
        {isWorking ? <ActivityIndicator style={styles.loader} /> : null}
        {workProduct ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{workProduct.title}</Text>
            <Text style={styles.body}>{workProduct.introduction}</Text>
            {workProduct.sections.map((section) => (
              <View key={section.title} style={styles.resultSection}>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.body}>{section.content}</Text>
              </View>
            ))}
            <Text style={styles.evidence}>
              {workProduct.libraryCitations.length} {t("intelligence.librarySources")} · {workProduct.researchCitations.length} {t("intelligence.researchSources")}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: theme.spacing.xxxl },
  eyebrow: { ...theme.typography.caption, color: theme.colors.primary, letterSpacing: 1 },
  title: { ...theme.typography.sectionTitle, color: theme.colors.text, marginTop: theme.spacing.xs },
  description: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 21, marginTop: theme.spacing.sm },
  loader: { marginTop: theme.spacing.lg },
  error: { ...theme.typography.caption, color: theme.colors.danger, marginTop: theme.spacing.md },
  versionCard: { alignItems: "center", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.lg, padding: theme.spacing.lg },
  versionIcon: { alignItems: "center", backgroundColor: theme.colors.background, borderRadius: 999, height: 44, justifyContent: "center", width: 44 },
  flex: { flex: 1 },
  cardTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  secondary: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18, marginTop: theme.spacing.xs },
  section: { marginTop: theme.spacing.xxl },
  sectionTitle: { ...theme.typography.sectionTitle, color: theme.colors.text, marginBottom: theme.spacing.md },
  itemCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, marginBottom: theme.spacing.sm, padding: theme.spacing.md },
  row: { alignItems: "center", flexDirection: "row", gap: theme.spacing.sm },
  itemTitle: { ...theme.typography.bodyStrong, color: theme.colors.text, flex: 1 },
  confidence: { ...theme.typography.caption, color: theme.colors.primary },
  evidence: { ...theme.typography.caption, color: theme.colors.primary, marginTop: theme.spacing.sm },
  pressed: { opacity: 0.72 },
  input: { ...theme.typography.body, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, color: theme.colors.text, minHeight: 82, padding: theme.spacing.md, textAlignVertical: "top" },
  researchRow: { alignItems: "center", flexDirection: "row", gap: theme.spacing.md, marginTop: theme.spacing.md },
  switchTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  taskGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.md },
  taskButton: { alignItems: "center", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flexDirection: "row", gap: theme.spacing.xs, minHeight: 52, padding: theme.spacing.sm, width: "48.5%" },
  taskText: { ...theme.typography.caption, color: theme.colors.text, flex: 1, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  resultCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, borderRadius: theme.radius.lg, borderWidth: 1, marginTop: theme.spacing.lg, padding: theme.spacing.lg },
  resultTitle: { ...theme.typography.sectionTitle, color: theme.colors.text },
  body: { ...theme.typography.body, color: theme.colors.text, lineHeight: 22, marginTop: theme.spacing.sm },
  resultSection: { borderTopColor: theme.colors.border, borderTopWidth: 1, marginTop: theme.spacing.lg, paddingTop: theme.spacing.lg },
});
