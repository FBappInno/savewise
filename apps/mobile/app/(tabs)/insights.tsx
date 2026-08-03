import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSecondBrain } from "@/hooks/use-second-brain";
import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";
import type {
  KnowledgeAnswer,
  SecondBrainOverview,
} from "@savewise/shared";

const EXAMPLE_QUESTIONS = [
  "Was weiß ich über Protein?",
  "Welche Quellen widersprechen sich?",
  "Fasse mein Wissen über Ernährung zusammen.",
];

export default function SecondBrainScreen() {
  const { settings, t } = useAppSettings();
  const [question, setQuestion] = useState("");
  const {
    overview,
    answer,
    isLoadingOverview,
    isAnswering,
    overviewError,
    answerError,
    loadOverview,
    ask,
  } = useSecondBrain();

  function submitQuestion() {
    void ask(question);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t("brain.eyebrow")}</Text>
          <Text style={styles.title}>{t("brain.title")}</Text>
          <Text style={styles.subtitle}>
            {t("brain.subtitle")}
          </Text>
        </View>

        {!settings.ai.knowledgeGraph ? (
          <ErrorCard message={t("brain.disabled")} />
        ) : null}

        <View style={styles.askCard}>
          <TextInput
            editable={!isAnswering && settings.ai.knowledgeGraph}
            multiline
            onChangeText={setQuestion}
            onSubmitEditing={submitQuestion}
            placeholder={t("brain.placeholder")}
            placeholderTextColor={theme.colors.textSecondary}
            returnKeyType="send"
            style={styles.input}
            value={question}
          />

          <Pressable
            accessibilityRole="button"
            disabled={isAnswering || question.trim().length < 3 || !settings.ai.knowledgeGraph}
            onPress={submitQuestion}
            style={({ pressed }) => [
              styles.askButton,
              (isAnswering || question.trim().length < 3) &&
                styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {isAnswering ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons color="#ffffff" name="sparkles" size={18} />
                <Text style={styles.askButtonText}>{t("brain.synthesize")}</Text>
              </>
            )}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.examples}
        >
          {EXAMPLE_QUESTIONS.map((example) => (
            <Pressable
              key={example}
              onPress={() => setQuestion(example)}
              style={styles.exampleChip}
            >
              <Text style={styles.exampleText}>{example}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {answerError ? <ErrorCard message={answerError} /> : null}
        {answer ? <AnswerCard answer={answer} /> : null}

        <View style={styles.analysisHeader}>
          <View style={styles.analysisTitleContainer}>
            <Text style={styles.sectionEyebrow}>{t("brain.health")}</Text>
            <Text style={styles.sectionTitle}>{t("brain.development")}</Text>
          </View>

          <Pressable
            disabled={isLoadingOverview}
            onPress={() => void loadOverview()}
            style={({ pressed }) => [
              styles.analyzeButton,
              pressed && styles.pressed,
            ]}
          >
            {isLoadingOverview ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={styles.analyzeButtonText}>
                {overview ? t("brain.refresh") : t("brain.analyze")}
              </Text>
            )}
          </Pressable>
        </View>

        {overviewError ? <ErrorCard message={overviewError} /> : null}
        {overview ? <OverviewContent overview={overview} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AnswerCard({ answer }: { answer: KnowledgeAnswer }) {
  return (
    <View style={styles.answerCard}>
      <View style={styles.cardHeader}>
        <Ionicons color={theme.colors.primary} name="sparkles-outline" size={20} />
        <Text style={styles.cardEyebrow}>
          SYNTHESIZED ANSWER · {Math.round(answer.confidence * 100)}%
        </Text>
      </View>

      <Text style={styles.answerText}>{answer.answer}</Text>

      {answer.contradictions.map((contradiction) => (
        <View key={contradiction.title} style={styles.contradictionCard}>
          <Text style={styles.contradictionTitle}>{contradiction.title}</Text>
          <Text style={styles.secondaryText}>{contradiction.explanation}</Text>
        </View>
      ))}

      {answer.citations.length > 0 ? (
        <View style={styles.sourcesSection}>
          <Text style={styles.smallTitle}>Knowledge sources</Text>
          {answer.citations.map((citation) => (
            <View key={citation.discoveryId} style={styles.sourceRow}>
              <View style={styles.sourceDot} />
              <View style={styles.flex}>
                <Text style={styles.sourceTitle}>{citation.title}</Text>
                <Text style={styles.secondaryText}>{citation.contribution}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function OverviewContent({ overview }: { overview: SecondBrainOverview }) {
  return (
    <View style={styles.overviewContainer}>
      <View style={styles.card}>
        <Text style={styles.smallTitle}>Current knowledge</Text>
        <Text style={styles.bodyText}>{overview.knowledgeSummary}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Knowledge gaps</Text>
        {overview.gaps.map((gap) => (
          <View key={gap.id} style={styles.card}>
            <View style={styles.gapTitleRow}>
              <Text style={styles.cardTitle}>{gap.title}</Text>
              <Text style={styles.priority}>{Math.round(gap.priority * 100)}%</Text>
            </View>
            <Text style={styles.secondaryText}>{gap.description}</Text>
            <View style={styles.chips}>
              {gap.suggestedTopics.map((topic) => (
                <View key={topic} style={styles.topicChip}>
                  <Text style={styles.topicText}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Knowledge evolution</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>{overview.evolution.summary}</Text>
          {overview.evolution.developments.map((development) => (
            <View key={`${development.from}-${development.to}-${development.title}`} style={styles.development}>
              <Text style={styles.timeline}>{development.from} → {development.to}</Text>
              <Text style={styles.cardTitle}>{development.title}</Text>
              <Text style={styles.secondaryText}>{development.description}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <View style={styles.errorCard}>
      <Ionicons color={theme.colors.textSecondary} name="alert-circle-outline" size={20} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xxxl, paddingBottom: theme.spacing.xxxl },
  header: { marginBottom: theme.spacing.xxl },
  eyebrow: { ...theme.typography.caption, color: theme.colors.primary, letterSpacing: 1.2 },
  title: { ...theme.typography.screenTitle, color: theme.colors.text, marginTop: theme.spacing.sm },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 22, marginTop: theme.spacing.sm },
  askCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, padding: theme.spacing.md },
  input: { ...theme.typography.body, color: theme.colors.text, minHeight: 86, padding: theme.spacing.sm, textAlignVertical: "top" },
  askButton: { alignItems: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.sm, justifyContent: "center", minHeight: 48 },
  askButtonText: { ...theme.typography.bodyStrong, color: "#ffffff" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
  examples: { marginHorizontal: -theme.spacing.xl, marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.xl },
  exampleChip: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 999, borderWidth: 1, marginRight: theme.spacing.sm, maxWidth: 260, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  exampleText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  answerCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, borderRadius: theme.radius.lg, borderWidth: 1, marginTop: theme.spacing.xxl, padding: theme.spacing.lg },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: theme.spacing.sm },
  cardEyebrow: { ...theme.typography.caption, color: theme.colors.primary, flex: 1, letterSpacing: 0.5 },
  answerText: { ...theme.typography.body, color: theme.colors.text, lineHeight: 23, marginTop: theme.spacing.md },
  contradictionCard: { backgroundColor: theme.colors.background, borderRadius: theme.radius.md, marginTop: theme.spacing.md, padding: theme.spacing.md },
  contradictionTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  sourcesSection: { borderTopColor: theme.colors.border, borderTopWidth: 1, marginTop: theme.spacing.lg, paddingTop: theme.spacing.lg },
  smallTitle: { ...theme.typography.bodyStrong, color: theme.colors.text, marginBottom: theme.spacing.md },
  sourceRow: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md },
  sourceDot: { backgroundColor: theme.colors.primary, borderRadius: 999, height: 7, marginTop: 7, width: 7 },
  sourceTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  secondaryText: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18, marginTop: theme.spacing.xs },
  flex: { flex: 1 },
  analysisHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.xxxl },
  analysisTitleContainer: { flex: 1 },
  sectionEyebrow: { ...theme.typography.caption, color: theme.colors.primary, letterSpacing: 1 },
  sectionTitle: { ...theme.typography.sectionTitle, color: theme.colors.text, marginTop: theme.spacing.xs },
  analyzeButton: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 999, borderWidth: 1, minWidth: 84, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  analyzeButtonText: { ...theme.typography.caption, color: theme.colors.primary, textAlign: "center" },
  overviewContainer: { marginTop: theme.spacing.lg },
  section: { gap: theme.spacing.md, marginTop: theme.spacing.xxl },
  card: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, padding: theme.spacing.lg },
  cardTitle: { ...theme.typography.bodyStrong, color: theme.colors.text, flex: 1 },
  bodyText: { ...theme.typography.body, color: theme.colors.text, lineHeight: 22 },
  gapTitleRow: { alignItems: "center", flexDirection: "row", gap: theme.spacing.md },
  priority: { ...theme.typography.caption, color: theme.colors.primary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs, marginTop: theme.spacing.md },
  topicChip: { backgroundColor: theme.colors.background, borderRadius: 999, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs },
  topicText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  development: { borderTopColor: theme.colors.border, borderTopWidth: 1, marginTop: theme.spacing.lg, paddingTop: theme.spacing.lg },
  timeline: { ...theme.typography.caption, color: theme.colors.primary, marginBottom: theme.spacing.xs },
  errorCard: { alignItems: "center", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.lg, padding: theme.spacing.md },
  errorText: { ...theme.typography.body, color: theme.colors.textSecondary, flex: 1 },
});
