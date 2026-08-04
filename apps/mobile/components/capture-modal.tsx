import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";

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

import { SaveWiseButton } from "@/components/savewise-button";
import { useAppSettings } from "@/providers/app-settings-provider";
import {
  isValidDiscoveryUrl,
  normalizeDiscoveryUrl,
} from "@/services/content-import-client";
import { resolveMetadata } from "@/services/metadata-resolver";
import { theme } from "@/theme";
import type { CapturedItem } from "@/types/captured-item";

type CaptureModalProps = {
  visible: boolean;
  existingKnowledgePaths: string[][];
  onClose: () => void;
  onSave: (
    capturedItem: CapturedItem,
  ) => void;
};

export function CaptureModal({
  visible,
  existingKnowledgePaths,
  onClose,
  onSave,
}: CaptureModalProps) {
  const { locale } = useAppSettings();
  const [url, setUrl] = useState("");
  const [isPathPickerOpen, setPathPickerOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);
  const [customPath, setCustomPath] = useState("");
  const labels = captureLabels[locale];

  useEffect(() => {
    if (!visible) setPathPickerOpen(false);
  }, [visible]);

  const normalizedUrl = useMemo(
    () => normalizeDiscoveryUrl(url),
    [url],
  );

  const isValidUrl = useMemo(
    () => isValidDiscoveryUrl(url),
    [url],
  );

  const metadata = useMemo(
    () =>
      isValidUrl
        ? resolveMetadata(normalizedUrl)
        : null,
    [
      isValidUrl,
      normalizedUrl,
    ],
  );

  function resetForm() {
    setUrl("");
    setSelectedPath(null);
    setCustomPath("");
    setPathPickerOpen(false);
  }

  function handleSave() {
    if (
      !isValidUrl ||
      !metadata
    ) {
      return;
    }

    const capturedItem: CapturedItem = {
      id: Date.now().toString(),

      title: metadata.title,

      url: normalizedUrl,

      source: metadata.source,

      capturedAt:
        new Date().toISOString(),

      preferredKnowledgePath: resolvePreferredPath(selectedPath, customPath),
    };

    onSave(capturedItem);
    resetForm();
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
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
        style={styles.screen}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={handleClose}
          >
            <Text
              style={styles.cancelText}
            >
              {labels.cancel}
            </Text>
          </Pressable>

          <Text
            style={styles.headerTitle}
          >
            {labels.newDiscovery}
          </Text>

          <View
            style={styles.headerSpacer}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>
            {labels.link}
          </Text>

          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            keyboardType="url"
            onChangeText={setUrl}
            onSubmitEditing={
              handleSave
            }
            placeholder="example.com/article"
            placeholderTextColor={
              theme.colors.placeholder
            }
            returnKeyType="done"
            style={styles.input}
            value={url}
          />

          {url.trim().length > 0 &&
          !isValidUrl ? (
            <Text
              style={styles.validationText}
            >
              {labels.invalidUrl}
            </Text>
          ) : null}

          {metadata ? (
            <View style={styles.preview}>
              <Text
                style={
                  styles.previewLabel
                }
              >
                {labels.detected}
              </Text>

              <Text
                style={
                  styles.previewTitle
                }
              >
                {metadata.title}
              </Text>

              <Text
                style={
                  styles.previewSource
                }
              >
                {formatSource(
                  metadata.source,
                )}
              </Text>

              <Text
                numberOfLines={2}
                style={styles.previewUrl}
              >
                {normalizedUrl}
              </Text>
            </View>
          ) : null}

          <Text style={styles.pathLabel}>{labels.path}</Text>
          <Text style={styles.pathHint}>{labels.pathHint}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => setPathPickerOpen((open) => !open)}
            style={({ pressed }) => [styles.pathSelect, pressed && styles.pressed]}
          >
            <Text numberOfLines={2} style={styles.pathSelectText}>
              {selectedPath ? selectedPath.join(" › ") : labels.automatic}
            </Text>
            <Ionicons color={theme.colors.textSecondary} name={isPathPickerOpen ? "chevron-up" : "chevron-down"} size={18} />
          </Pressable>

          {isPathPickerOpen ? (
            <ScrollView
              nestedScrollEnabled
              style={styles.pathOptions}
            >
              <PathOption
                label={labels.automatic}
                onPress={() => { setSelectedPath(null); setCustomPath(""); setPathPickerOpen(false); }}
                selected={!selectedPath && !customPath.trim()}
              />
              {existingKnowledgePaths.map((path) => (
                <PathOption
                  key={path.join("/")}
                  label={path.join(" › ")}
                  onPress={() => { setSelectedPath(path); setCustomPath(""); setPathPickerOpen(false); }}
                  selected={selectedPath?.join("/") === path.join("/")}
                />
              ))}
            </ScrollView>
          ) : null}

          <TextInput
            autoCapitalize="sentences"
            onChangeText={(value) => { setCustomPath(value); if (value.trim()) setSelectedPath(null); }}
            placeholder={labels.customPlaceholder}
            placeholderTextColor={theme.colors.placeholder}
            style={[styles.input, styles.customPathInput]}
            value={customPath}
          />

          <View
            style={
              styles.buttonContainer
            }
          >
            <SaveWiseButton
              disabled={!isValidUrl}
              label={labels.save}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PathOption({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.pathOption}>
      <Text style={[styles.pathOptionText, selected && styles.pathOptionTextSelected]}>{label}</Text>
      {selected ? <Ionicons color={theme.colors.primary} name="checkmark" size={18} /> : null}
    </Pressable>
  );
}

function resolvePreferredPath(selectedPath: string[] | null, customPath: string): string[] | undefined {
  if (selectedPath) return selectedPath;
  const parts = customPath.split(/\s*(?:›|>|\/|;)\s*/).map((part) => part.trim()).filter(Boolean).slice(0, 3);
  return parts.length > 0 ? parts : undefined;
}

const captureLabels = {
  de: { cancel: "Abbrechen", newDiscovery: "Neue Discovery", link: "Link", invalidUrl: "Bitte gib eine gültige Webadresse ein.", detected: "SaveWise erkannt", save: "Discovery speichern", path: "Pfad im Wissensbaum", pathHint: "Optional: Bestehenden Pfad wählen oder selbst eingeben.", automatic: "Automatisch durch KI", customPlaceholder: "Eigener Pfad, z. B. Reisen › Mittelmeer" },
  en: { cancel: "Cancel", newDiscovery: "New discovery", link: "Link", invalidUrl: "Please enter a valid web address.", detected: "SaveWise detected", save: "Save discovery", path: "Knowledge-tree path", pathHint: "Optional: choose an existing path or enter your own.", automatic: "Automatic by AI", customPlaceholder: "Custom path, e.g. Travel › Mediterranean" },
  fr: { cancel: "Annuler", newDiscovery: "Nouvelle découverte", link: "Lien", invalidUrl: "Saisissez une adresse web valide.", detected: "SaveWise a détecté", save: "Enregistrer", path: "Chemin dans l’arbre", pathHint: "Facultatif : choisissez un chemin ou saisissez le vôtre.", automatic: "Automatique par IA", customPlaceholder: "Chemin personnalisé, p. ex. Voyages › Méditerranée" },
  it: { cancel: "Annulla", newDiscovery: "Nuova scoperta", link: "Link", invalidUrl: "Inserisci un indirizzo web valido.", detected: "SaveWise ha rilevato", save: "Salva scoperta", path: "Percorso nell’albero", pathHint: "Facoltativo: scegli un percorso o inseriscine uno.", automatic: "Automatico con IA", customPlaceholder: "Percorso, es. Viaggi › Mediterraneo" },
  es: { cancel: "Cancelar", newDiscovery: "Nuevo descubrimiento", link: "Enlace", invalidUrl: "Introduce una dirección web válida.", detected: "SaveWise detectó", save: "Guardar", path: "Ruta del árbol", pathHint: "Opcional: elige una ruta o introduce una propia.", automatic: "Automático por IA", customPlaceholder: "Ruta propia, p. ej. Viajes › Mediterráneo" },
} as const;

function formatSource(
  source: CapturedItem["source"],
): string {
  const labels: Record<
    CapturedItem["source"],
    string
  > = {
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
    backgroundColor:
      theme.colors.background,
  },

  header: {
    minHeight: 64,
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
    paddingHorizontal:
      theme.spacing.xl,
    paddingTop:
      theme.spacing.lg,
  },

  headerSpacer: {
    width: 48,
  },

  cancelText: {
    ...theme.typography.body,
    color:
      theme.colors.primary,
  },

  headerTitle: {
    ...theme.typography.bodyStrong,
    color:
      theme.colors.text,
  },

  content: {
    padding:
      theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },

  label: {
    ...theme.typography.bodyStrong,
    color:
      theme.colors.text,
    marginBottom:
      theme.spacing.sm,
  },

  input: {
    ...theme.typography.body,
    backgroundColor:
      theme.colors.surface,
    borderColor:
      theme.colors.border,
    borderRadius:
      theme.radius.md,
    borderWidth: 1,
    color:
      theme.colors.text,
    paddingHorizontal:
      theme.spacing.lg,
    paddingVertical:
      theme.spacing.lg,
  },

  validationText: {
    ...theme.typography.caption,
    color:
      theme.colors.textSecondary,
    marginTop:
      theme.spacing.sm,
  },

  preview: {
    backgroundColor:
      theme.colors.surface,
    borderColor:
      theme.colors.border,
    borderRadius:
      theme.radius.lg,
    borderWidth: 1,
    marginTop:
      theme.spacing.xl,
    padding:
      theme.spacing.lg,
  },

  previewLabel: {
    ...theme.typography.caption,
    color:
      theme.colors.textSecondary,
  },

  previewTitle: {
    ...theme.typography.sectionTitle,
    color:
      theme.colors.text,
    marginTop:
      theme.spacing.sm,
  },

  previewSource: {
    ...theme.typography.body,
    color:
      theme.colors.primary,
    marginTop:
      theme.spacing.xs,
  },

  previewUrl: {
    ...theme.typography.caption,
    color:
      theme.colors.textSecondary,
    marginTop:
      theme.spacing.sm,
  },

  buttonContainer: {
    marginTop:
      theme.spacing.xl,
  },
  pathLabel: { ...theme.typography.bodyStrong, color: theme.colors.text, marginTop: theme.spacing.xl },
  pathHint: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  pathSelect: { alignItems: "center", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 54, paddingHorizontal: theme.spacing.lg },
  pathSelectText: { ...theme.typography.body, color: theme.colors.text, flex: 1, marginRight: theme.spacing.sm },
  pathOptions: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, marginTop: theme.spacing.xs, maxHeight: 240, overflow: "hidden" },
  pathOption: { alignItems: "center", borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 48, paddingHorizontal: theme.spacing.lg },
  pathOptionText: { ...theme.typography.caption, color: theme.colors.textSecondary, flex: 1 },
  pathOptionTextSelected: { color: theme.colors.primary, fontWeight: "700" },
  customPathInput: { marginTop: theme.spacing.sm },
  pressed: { opacity: 0.7 },
});
