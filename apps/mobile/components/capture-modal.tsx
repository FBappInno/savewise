import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SaveWiseButton } from "@/components/savewise-button";
import { resolveMetadata } from "@/services/metadata-resolver";
import { theme } from "@/theme";
import type { CapturedItem } from "@/types/captured-item";

type CaptureModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (capturedItem: CapturedItem) => void;
};

export function CaptureModal({
  visible,
  onClose,
  onSave,
}: CaptureModalProps) {
  const [url, setUrl] = useState("");

  const normalizedUrl = url.trim();

  const metadata = normalizedUrl
    ? resolveMetadata(normalizedUrl)
    : null;

  function resetForm() {
    setUrl("");
  }

  function handleSave() {
    if (!normalizedUrl || !metadata) {
      return;
    }

    const capturedItem: CapturedItem = {
      id: Date.now().toString(),
      title: metadata.title,
      url: normalizedUrl,
      source: metadata.source,
      capturedAt: new Date().toISOString(),
    };

    onSave(capturedItem);
    resetForm();
    onClose();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={handleClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <Text style={styles.headerTitle}>New discovery</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Link</Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            keyboardType="url"
            onChangeText={setUrl}
            onSubmitEditing={handleSave}
            placeholder="https://..."
            placeholderTextColor={theme.colors.placeholder}
            returnKeyType="done"
            style={styles.input}
            value={url}
          />

          {metadata && (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>
                SaveWise detected
              </Text>

              <Text style={styles.previewTitle}>
                {metadata.title}
              </Text>

              <Text style={styles.previewSource}>
                {formatSource(metadata.source)}
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <SaveWiseButton
              disabled={!normalizedUrl}
              label="Save discovery"
              onPress={handleSave}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function formatSource(source: CapturedItem["source"]) {
  const labels: Record<CapturedItem["source"], string> = {
    youtube: "YouTube",
    instagram: "Instagram",
    tiktok: "TikTok",
    web: "Web",
  };

  return labels[source];
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  header: {
    minHeight: 64,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },

  headerSpacer: {
    width: 48,
  },

  cancelText: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },

  headerTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
  },

  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },

  label: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },

  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },

  preview: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
  },

  previewLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  previewTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },

  previewSource: {
    ...theme.typography.body,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },

  buttonContainer: {
    marginTop: theme.spacing.xl,
  },
});