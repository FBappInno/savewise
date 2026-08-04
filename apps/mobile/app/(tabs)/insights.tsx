import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { PersonalIntelligencePanel } from "@/components/intelligence/personal-intelligence-panel";
import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";
import type {
  KnowledgeAnswer,
  KnowledgeDocument,
  KnowledgeDocumentType,
  SecondBrainOverview,
} from "@savewise/shared";
import { trackAnonymousEvent } from "@/services/anonymous-analytics";

const DOCUMENT_TYPES: { type: KnowledgeDocumentType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: "summary", icon: "reader-outline" },
  { type: "learning-plan", icon: "school-outline" },
  { type: "presentation", icon: "easel-outline" },
  { type: "blog-article", icon: "create-outline" },
  { type: "checklist", icon: "checkbox-outline" },
  { type: "project-overview", icon: "map-outline" },
];

const EXAMPLE_QUESTIONS = {
  de: ["Was weiß ich über Protein?", "Welche Quellen widersprechen sich?", "Fasse mein Wissen über Ernährung zusammen."],
  en: ["What do I know about protein?", "Which sources contradict each other?", "Summarize my knowledge about nutrition."],
  fr: ["Que sais-je sur les protéines ?", "Quelles sources se contredisent ?", "Résume mes connaissances sur la nutrition."],
  it: ["Cosa so sulle proteine?", "Quali fonti si contraddicono?", "Riassumi le mie conoscenze sulla nutrizione."],
  es: ["¿Qué sé sobre proteínas?", "¿Qué fuentes se contradicen?", "Resume mi conocimiento sobre nutrición."],
} as const;

export default function SecondBrainScreen() {
  const { locale, settings, t } = useAppSettings();
  const [question, setQuestion] = useState("");
  const {
    overview,
    conversation,
    document,
    isLoadingOverview,
    isAnswering,
    isGeneratingDocument,
    overviewError,
    answerError,
    documentError,
    loadOverview,
    ask,
    createDocument,
    clearConversation,
  } = useSecondBrain();
  const exampleQuestions = EXAMPLE_QUESTIONS[locale];

  async function submitQuestion() {
    const currentQuestion = question.trim();
    if (currentQuestion.length < 3) return;
    setQuestion("");
    void trackAnonymousEvent("AIChatQuestion", { operation: "ai-chat" });
    await ask(currentQuestion);
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
          {exampleQuestions.map((example) => (
            <Pressable
              key={example}
              onPress={() => setQuestion(example)}
              style={styles.exampleChip}
            >
              <Text style={styles.exampleText}>{example}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <PersonalIntelligencePanel />

        {conversation.length > 0 ? (
          <View style={styles.chatHeader}>
            <Text style={styles.sectionTitle}>{t("brain.chat")}</Text>
            <Pressable onPress={clearConversation}>
              <Text style={styles.clearText}>{t("brain.clearChat")}</Text>
            </Pressable>
          </View>
        ) : null}

        {answerError ? <ErrorCard message={answerError} /> : null}
        {conversation.map((turn) => (
          <View key={turn.generatedAt} style={styles.chatTurn}>
            <View style={styles.questionBubble}>
              <Text style={styles.questionText}>{turn.question}</Text>
            </View>
            <AnswerCard answer={turn} />
          </View>
        ))}

        <DocumentGenerator
          document={document}
          error={documentError}
          isGenerating={isGeneratingDocument}
          onGenerate={createDocument}
        />

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
  const { t } = useAppSettings();
  return (
    <View style={styles.answerCard}>
      <View style={styles.cardHeader}>
        <Ionicons color={theme.colors.primary} name="sparkles-outline" size={20} />
        <Text style={styles.cardEyebrow}>
          {t("brain.synthesizedAnswer")} · {Math.round(answer.confidence * 100)}%
        </Text>
      </View>

      <Text style={styles.answerText}>{answer.answer}</Text>

      {answer.insufficientKnowledge ? (
        <View style={styles.missingCard}>
          <Ionicons color={theme.colors.danger} name="information-circle-outline" size={19} />
          <Text style={styles.missingText}>{answer.insufficientKnowledge}</Text>
        </View>
      ) : null}

      <SynthesisContent answer={answer} />

      {answer.contradictions.map((contradiction) => (
        <View key={contradiction.title} style={styles.contradictionCard}>
          <Text style={styles.contradictionTitle}>{contradiction.title}</Text>
          <Text style={styles.secondaryText}>{contradiction.explanation}</Text>
        </View>
      ))}

      {answer.citations.length > 0 ? (
        <View style={styles.sourcesSection}>
          <Text style={styles.smallTitle}>{t("brain.sources")}</Text>
          {answer.citations.map((citation) => (
            <Pressable
              accessibilityRole="button"
              key={citation.discoveryId}
              onPress={() => router.push(`/discovery/${citation.discoveryId}`)}
              style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}
            >
              <View style={styles.sourceDot} />
              <View style={styles.flex}>
                <Text style={styles.sourceTitle}>{citation.title}</Text>
                <Text style={styles.secondaryText}>{citation.contribution}</Text>
              </View>
              <Ionicons color={theme.colors.placeholder} name="chevron-forward" size={17} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SynthesisContent({ answer }: { answer: KnowledgeAnswer }) {
  const { t } = useAppSettings();
  const sections = [
    { title: t("brain.overallInsight"), values: [answer.synthesis.overallInsight] },
    { title: t("brain.sharedStatements"), values: answer.synthesis.sharedStatements },
    { title: t("brain.differentStatements"), values: answer.synthesis.differingStatements },
    { title: t("brain.openQuestions"), values: answer.synthesis.openQuestions },
    { title: t("brain.practicalConclusions"), values: answer.synthesis.practicalConclusions },
  ].filter((section) => section.values.some(Boolean));

  return (
    <View style={styles.synthesisSection}>
      {sections.map((section) => (
        <View key={section.title} style={styles.synthesisBlock}>
          <Text style={styles.smallTitle}>{section.title}</Text>
          {section.values.map((value, index) => (
            <View key={`${section.title}-${index}`} style={styles.bulletRow}>
              <View style={styles.sourceDot} />
              <Text style={styles.secondaryText}>{value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function DocumentGenerator({
  document,
  error,
  isGenerating,
  onGenerate,
}: {
  document: KnowledgeDocument | null;
  error: string | null;
  isGenerating: boolean;
  onGenerate: (type: KnowledgeDocumentType, instruction: string) => Promise<void>;
}) {
  const { t } = useAppSettings();
  const [instruction, setInstruction] = useState("");

  return (
    <View style={styles.documentSection}>
      <Text style={styles.sectionEyebrow}>{t("brain.documents")}</Text>
      <Text style={styles.sectionTitle}>{t("brain.createFromKnowledge")}</Text>
      <TextInput
        onChangeText={setInstruction}
        placeholder={t("brain.documentInstruction")}
        placeholderTextColor={theme.colors.placeholder}
        style={styles.documentInput}
        value={instruction}
      />
      <View style={styles.documentGrid}>
        {DOCUMENT_TYPES.map(({ type, icon }) => (
          <Pressable
            disabled={isGenerating}
            key={type}
            onPress={() => void onGenerate(type, instruction.trim() || t(`brain.documentPrompt.${type}`))}
            style={({ pressed }) => [styles.documentButton, pressed && styles.pressed]}
          >
            <Ionicons color={theme.colors.primary} name={icon} size={20} />
            <Text style={styles.documentButtonText}>{t(`brain.documentType.${type}`)}</Text>
          </Pressable>
        ))}
      </View>
      {isGenerating ? <ActivityIndicator style={styles.documentLoader} /> : null}
      {error ? <ErrorCard message={error} /> : null}
      {document ? <KnowledgeDocumentCard document={document} /> : null}
    </View>
  );
}

function KnowledgeDocumentCard({ document }: { document: KnowledgeDocument }) {
  const { t } = useAppSettings();
  return (
    <View style={styles.documentCard}>
      <Text style={styles.cardTitle}>{document.title}</Text>
      <Text style={styles.bodyText}>{document.introduction}</Text>
      {document.sections.map((section) => (
        <View key={section.title} style={styles.documentContentSection}>
          <Text style={styles.smallTitle}>{section.title}</Text>
          <Text style={styles.bodyText}>{section.content}</Text>
          {section.discoveryIds.length > 0 ? (
            <Text style={styles.evidenceCount}>
              {section.discoveryIds.length} {t("brain.supportingSources")}
            </Text>
          ) : null}
        </View>
      ))}
      {document.limitations.length > 0 ? (
        <View style={styles.missingCard}>
          <Text style={styles.missingText}>{document.limitations.join("\n")}</Text>
        </View>
      ) : null}
      {document.citations.length > 0 ? (
        <View style={styles.sourcesSection}>
          <Text style={styles.smallTitle}>{t("brain.sources")}</Text>
          {document.citations.map((citation) => (
            <Pressable
              key={citation.discoveryId}
              onPress={() => router.push(`/discovery/${citation.discoveryId}`)}
              style={styles.sourceRow}
            >
              <View style={styles.sourceDot} />
              <View style={styles.flex}>
                <Text style={styles.sourceTitle}>{citation.title}</Text>
                <Text style={styles.secondaryText}>{citation.contribution}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function OverviewContent({ overview }: { overview: SecondBrainOverview }) {
  const { t } = useAppSettings();
  const qualityDimensions = [
    [t("brain.completeness"), overview.quality.completeness],
    [t("brain.recency"), overview.quality.recency],
    [t("brain.sourceDiversity"), overview.quality.sourceDiversity],
    [t("brain.trustworthiness"), overview.quality.trustworthiness],
    [t("brain.contradictions"), overview.quality.contradictions],
    [t("brain.redundancy"), overview.quality.redundancy],
  ] as const;

  return (
    <View style={styles.overviewContainer}>
      <View style={styles.card}>
        <Text style={styles.smallTitle}>{t("brain.currentKnowledge")}</Text>
        <Text style={styles.bodyText}>{overview.knowledgeSummary}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.qualityHeader}>
          <Text style={styles.sectionTitle}>{t("brain.knowledgeQuality")}</Text>
          <Text style={styles.qualityScore}>{Math.round(overview.quality.overallScore * 100)}%</Text>
        </View>
        <View style={styles.qualityGrid}>
          {qualityDimensions.map(([label, dimension]) => (
            <View key={label} style={styles.qualityCard}>
              <Text style={styles.qualityValue}>{Math.round(dimension.score * 100)}%</Text>
              <Text style={styles.qualityLabel}>{label}</Text>
              <Text style={styles.qualitySummary}>{dimension.summary}</Text>
            </View>
          ))}
        </View>
        {overview.quality.findings.map((finding) => (
          <View key={finding} style={styles.findingRow}>
            <Ionicons color={theme.colors.primary} name="analytics-outline" size={17} />
            <Text style={styles.secondaryText}>{finding}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("brain.knowledgeGaps")}</Text>
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
        <Text style={styles.sectionTitle}>{t("brain.knowledgeEvolution")}</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("brain.personalProfile")}</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>{overview.profile.developmentSummary}</Text>
          <ProfileItems title={t("brain.interests")} values={overview.profile.interests} />
          <ProfileItems title={t("brain.projects")} values={overview.profile.projects} />
          <ProfileItems title={t("brain.learningGoals")} values={overview.profile.learningGoals} />
          <ProfileItems title={t("brain.frequentQuestions")} values={overview.profile.frequentQuestions} />
        </View>
      </View>
    </View>
  );
}

function ProfileItems({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <View style={styles.profileSection}>
      <Text style={styles.smallTitle}>{title}</Text>
      <View style={styles.chips}>
        {values.map((value) => (
          <View key={value} style={styles.topicChip}>
            <Text style={styles.topicText}>{value}</Text>
          </View>
        ))}
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
  content: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xxxl + theme.spacing.sm, paddingBottom: theme.spacing.xxxl },
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
  chatHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.xxl },
  clearText: { ...theme.typography.caption, color: theme.colors.primary },
  chatTurn: { marginTop: theme.spacing.lg },
  questionBubble: { alignSelf: "flex-end", backgroundColor: theme.colors.primary, borderRadius: theme.radius.lg, borderBottomRightRadius: 4, maxWidth: "86%", paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  questionText: { ...theme.typography.body, color: theme.colors.textOnPrimary },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: theme.spacing.sm },
  cardEyebrow: { ...theme.typography.caption, color: theme.colors.primary, flex: 1, letterSpacing: 0.5 },
  answerText: { ...theme.typography.body, color: theme.colors.text, lineHeight: 23, marginTop: theme.spacing.md },
  missingCard: { alignItems: "flex-start", backgroundColor: theme.colors.background, borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md, padding: theme.spacing.md },
  missingText: { ...theme.typography.caption, color: theme.colors.textSecondary, flex: 1, lineHeight: 18 },
  synthesisSection: { borderTopColor: theme.colors.border, borderTopWidth: 1, marginTop: theme.spacing.lg, paddingTop: theme.spacing.sm },
  synthesisBlock: { marginTop: theme.spacing.md },
  bulletRow: { alignItems: "flex-start", flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  contradictionCard: { backgroundColor: theme.colors.background, borderRadius: theme.radius.md, marginTop: theme.spacing.md, padding: theme.spacing.md },
  contradictionTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  sourcesSection: { borderTopColor: theme.colors.border, borderTopWidth: 1, marginTop: theme.spacing.lg, paddingTop: theme.spacing.lg },
  smallTitle: { ...theme.typography.bodyStrong, color: theme.colors.text, marginBottom: theme.spacing.md },
  sourceRow: { flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md },
  sourceDot: { backgroundColor: theme.colors.primary, borderRadius: 999, height: 7, marginTop: 7, width: 7 },
  sourceTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  secondaryText: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 18, marginTop: theme.spacing.xs },
  flex: { flex: 1 },
  documentSection: { marginTop: theme.spacing.xxxl },
  documentInput: { ...theme.typography.body, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, color: theme.colors.text, marginTop: theme.spacing.md, minHeight: 50, padding: theme.spacing.md },
  documentGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.md },
  documentButton: { alignItems: "center", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, gap: theme.spacing.xs, justifyContent: "center", minHeight: 82, padding: theme.spacing.md, width: "48.5%" },
  documentButtonText: { ...theme.typography.caption, color: theme.colors.text, fontWeight: "700", textAlign: "center" },
  documentLoader: { marginTop: theme.spacing.lg },
  documentCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary, borderRadius: theme.radius.lg, borderWidth: 1, marginTop: theme.spacing.lg, padding: theme.spacing.lg },
  documentContentSection: { borderTopColor: theme.colors.border, borderTopWidth: 1, marginTop: theme.spacing.lg, paddingTop: theme.spacing.lg },
  evidenceCount: { ...theme.typography.caption, color: theme.colors.primary, marginTop: theme.spacing.sm },
  analysisHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.xxxl },
  analysisTitleContainer: { flex: 1 },
  sectionEyebrow: { ...theme.typography.caption, color: theme.colors.primary, letterSpacing: 1 },
  sectionTitle: { ...theme.typography.sectionTitle, color: theme.colors.text, marginTop: theme.spacing.xs },
  analyzeButton: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 999, borderWidth: 1, minWidth: 84, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  analyzeButtonText: { ...theme.typography.caption, color: theme.colors.primary, textAlign: "center" },
  overviewContainer: { marginTop: theme.spacing.lg },
  qualityHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  qualityScore: { ...theme.typography.sectionTitle, color: theme.colors.primary },
  qualityGrid: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
  qualityCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, padding: theme.spacing.md, width: "48.5%" },
  qualityValue: { ...theme.typography.sectionTitle, color: theme.colors.primary },
  qualityLabel: { ...theme.typography.caption, color: theme.colors.text, fontWeight: "700", marginTop: theme.spacing.xs },
  qualitySummary: { ...theme.typography.caption, color: theme.colors.textSecondary, lineHeight: 17, marginTop: theme.spacing.xs },
  findingRow: { alignItems: "flex-start", flexDirection: "row", gap: theme.spacing.sm },
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
  profileSection: { borderTopColor: theme.colors.border, borderTopWidth: 1, marginTop: theme.spacing.lg, paddingTop: theme.spacing.lg },
  timeline: { ...theme.typography.caption, color: theme.colors.primary, marginBottom: theme.spacing.xs },
  errorCard: { alignItems: "center", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.lg, padding: theme.spacing.md },
  errorText: { ...theme.typography.body, color: theme.colors.textSecondary, flex: 1 },
});
