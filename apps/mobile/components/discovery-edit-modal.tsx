import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { theme } from "@/theme";
import type {
  Discovery,
  DiscoveryCategory,
  DiscoveryUpdate,
} from "@/types/discovery";

const CATEGORIES: DiscoveryCategory[] = [
  "technology", "finance", "business", "science", "health", "education",
  "productivity", "culture", "news", "lifestyle", "other",
];

export function DiscoveryEditModal({
  discovery,
  labels,
  onClose,
  onSave,
  visible,
}: {
  discovery: Discovery;
  labels: {
    title: string;
    description: string;
    titleField: string;
    summary: string;
    primaryCategory: string;
    secondaryCategory: string;
    topic: string;
    subtopics: string;
    subtopicsHint: string;
    cancel: string;
    save: string;
    saving: string;
  };
  onClose: () => void;
  onSave: (update: DiscoveryUpdate) => Promise<void>;
  visible: boolean;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [primaryCategory, setPrimaryCategory] = useState<DiscoveryCategory>("other");
  const [secondaryCategory, setSecondaryCategory] = useState("");
  const [topic, setTopic] = useState("");
  const [subtopics, setSubtopics] = useState("");
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(discovery.improvedTitle || discovery.title);
    setSummary(discovery.summary ?? "");
    setPrimaryCategory(discovery.classification?.primaryCategory ?? "other");
    setSecondaryCategory(discovery.classification?.secondaryCategory ?? "General");
    setTopic(discovery.classification?.topic ?? discovery.topics[0] ?? "General");
    setSubtopics(discovery.classification?.subtopics.join(", ") ?? "");
  }, [discovery, visible]);

  const isValid =
    title.trim().length >= 3 &&
    summary.trim().length <= 420 &&
    secondaryCategory.trim().length >= 2 &&
    topic.trim().length >= 2;

  async function handleSave() {
    if (!isValid || isSaving) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        summary: summary.trim(),
        classification: {
          primaryCategory,
          secondaryCategory: secondaryCategory.trim(),
          topic: topic.trim(),
          subtopics: [...new Set(
            subtopics.split(",").map((value) => value.trim()).filter(Boolean),
          )].slice(0, 6),
        },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <View style={styles.header}>
          <Pressable disabled={isSaving} onPress={onClose} style={styles.headerAction}>
            <Text style={styles.cancel}>{labels.cancel}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{labels.title}</Text>
          <Pressable
            disabled={!isValid || isSaving}
            onPress={() => void handleSave()}
            style={[styles.headerAction, styles.headerActionRight]}
          >
            <Text style={[styles.save, (!isValid || isSaving) && styles.disabled]}>
              {isSaving ? labels.saving : labels.save}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.description}>{labels.description}</Text>
          <Field label={labels.titleField} onChangeText={setTitle} value={title} />
          <Field
            label={labels.summary}
            maxLength={420}
            multiline
            onChangeText={setSummary}
            style={styles.multiline}
            value={summary}
          />
          <Text style={styles.counter}>{summary.length}/420</Text>

          <Text style={styles.pathTitle}>{labels.primaryCategory}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIES.map((category) => (
              <Pressable
                key={category}
                onPress={() => setPrimaryCategory(category)}
                style={[
                  styles.category,
                  category === primaryCategory && styles.categorySelected,
                ]}
              >
                <Text style={[
                  styles.categoryText,
                  category === primaryCategory && styles.categoryTextSelected,
                ]}>
                  {formatCategory(category)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Field
            label={labels.secondaryCategory}
            onChangeText={setSecondaryCategory}
            value={secondaryCategory}
          />
          <Field label={labels.topic} onChangeText={setTopic} value={topic} />
          <Field
            label={labels.subtopics}
            onChangeText={setSubtopics}
            placeholder={labels.subtopicsHint}
            value={subtopics}
          />

          <Pressable
            disabled={!isValid || isSaving}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.primaryButton,
              (!isValid || isSaving) && styles.primaryDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color="#ffffff" name="checkmark" size={20} />
            <Text style={styles.primaryButtonText}>
              {isSaving ? labels.saving : labels.save}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, style, ...props }: React.ComponentProps<typeof TextInput> & {
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.placeholder}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

function formatCategory(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { alignItems: "center", backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 58, paddingHorizontal: theme.spacing.lg },
  headerTitle: { color: theme.colors.text, flex: 1, fontSize: 16, fontWeight: "600", textAlign: "center" },
  headerAction: { width: 92 },
  headerActionRight: { alignItems: "flex-end" },
  cancel: { ...theme.typography.body, color: theme.colors.textSecondary },
  save: { ...theme.typography.bodyStrong, color: theme.colors.primary },
  disabled: { opacity: 0.4 },
  content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  description: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.xl },
  field: { marginBottom: theme.spacing.lg },
  label: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  input: { ...theme.typography.body, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, color: theme.colors.text, minHeight: 50, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md },
  multiline: { minHeight: 112, textAlignVertical: "top" },
  counter: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: -theme.spacing.md, textAlign: "right" },
  pathTitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, marginTop: theme.spacing.lg },
  category: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.pill, borderWidth: 1, marginRight: theme.spacing.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  categorySelected: { backgroundColor: "#EFF6FF", borderColor: theme.colors.primary },
  categoryText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  categoryTextSelected: { color: theme.colors.primary, fontWeight: "600" },
  primaryButton: { alignItems: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.sm, justifyContent: "center", minHeight: 52, marginTop: theme.spacing.lg },
  primaryButtonText: { ...theme.typography.button, color: "#ffffff" },
  primaryDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
});
