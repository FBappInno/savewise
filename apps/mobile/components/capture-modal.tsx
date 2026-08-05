import { Ionicons } from "@expo/vector-icons";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

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
import { StarBackground } from "@/components/universe-ui/star-background";
import { useAppSettings } from "@/providers/app-settings-provider";
import {
  isValidDiscoveryUrl,
  normalizeDiscoveryUrl,
} from "@/services/content-import-client";
import { resolveMetadata } from "@/services/metadata-resolver";
import { universeTheme } from "@/theme/universe-theme";
import type { CapturedItem } from "@/types/captured-item";

type CaptureModalProps = {
  visible: boolean;

  existingKnowledgePaths:
    string[][];

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
  const { locale } =
    useAppSettings();

  const [url, setUrl] =
    useState("");

  const [
    isPathPickerOpen,
    setPathPickerOpen,
  ] = useState(false);

  const [
    selectedPath,
    setSelectedPath,
  ] =
    useState<string[] | null>(
      null,
    );

  const [
    customPath,
    setCustomPath,
  ] = useState("");

  const labels =
    captureLabels[locale];

  useEffect(() => {
    if (!visible) {
      setPathPickerOpen(false);
    }
  }, [visible]);

  const normalizedUrl =
    useMemo(
      () =>
        normalizeDiscoveryUrl(
          url,
        ),
      [url],
    );

  const isValidUrl =
    useMemo(
      () =>
        isValidDiscoveryUrl(
          url,
        ),
      [url],
    );

  const metadata =
    useMemo(
      () =>
        isValidUrl
          ? resolveMetadata(
              normalizedUrl,
            )
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

    const capturedItem:
      CapturedItem = {
      id: Date.now().toString(),

      title: metadata.title,

      url: normalizedUrl,

      source: metadata.source,

      capturedAt:
        new Date().toISOString(),

      preferredKnowledgePath:
        resolvePreferredPath(
          selectedPath,
          customPath,
        ),
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
      onRequestClose={
        handleClose
      }
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
        <StarBackground density={55} />

        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .textSecondary
              }
              name="close"
              size={22}
            />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.eyebrow}>
              CAPTURE
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              {labels.newDiscovery}
            </Text>
          </View>

          <View
            style={styles.headerSpacer}
          />
        </View>

        <ScrollView
          contentContainerStyle={
            styles.content
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="sparkles-outline"
                size={24}
              />
            </View>

            <View style={styles.flex}>
              <Text
                style={
                  styles.introTitle
                }
              >
                Neues Wissen erfassen
              </Text>

              <Text
                style={
                  styles.introText
                }
              >
                SaveWise analysiert,
                ordnet und verbindet
                deinen Link automatisch.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>
            {labels.link}
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons
              color={
                universeTheme.colors
                  .primary
              }
              name="link-outline"
              size={19}
            />

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
                universeTheme.colors
                  .textMuted
              }
              returnKeyType="done"
              selectionColor={
                universeTheme.colors
                  .primaryBright
              }
              style={styles.input}
              value={url}
            />
          </View>

          {url.trim().length > 0 &&
          !isValidUrl ? (
            <View
              style={
                styles.validationRow
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .danger
                }
                name="alert-circle-outline"
                size={16}
              />

              <Text
                style={
                  styles.validationText
                }
              >
                {labels.invalidUrl}
              </Text>
            </View>
          ) : null}

          {metadata ? (
            <View style={styles.preview}>
              <View
                style={
                  styles.previewHeader
                }
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .green
                  }
                  name="checkmark-circle"
                  size={18}
                />

                <Text
                  style={
                    styles.previewLabel
                  }
                >
                  {labels.detected}
                </Text>
              </View>

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
                style={
                  styles.previewUrl
                }
              >
                {normalizedUrl}
              </Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              KNOWLEDGE PATH
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              {labels.path}
            </Text>

            <Text
              style={
                styles.sectionHint
              }
            >
              {labels.pathHint}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setPathPickerOpen(
                (open) => !open,
              )
            }
            style={({ pressed }) => [
              styles.pathSelect,

              pressed &&
                styles.pressed,
            ]}
          >
            <View style={styles.pathLeft}>
              <Ionicons
                color={
                  universeTheme.colors
                    .primary
                }
                name="git-network-outline"
                size={18}
              />

              <Text
                numberOfLines={2}
                style={
                  styles.pathSelectText
                }
              >
                {selectedPath
                  ? selectedPath.join(
                      " › ",
                    )
                  : labels.automatic}
              </Text>
            </View>

            <Ionicons
              color={
                universeTheme.colors
                  .textSecondary
              }
              name={
                isPathPickerOpen
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={18}
            />
          </Pressable>

          {isPathPickerOpen ? (
            <ScrollView
              nestedScrollEnabled
              style={
                styles.pathOptions
              }
            >
              <PathOption
                label={
                  labels.automatic
                }
                onPress={() => {
                  setSelectedPath(
                    null,
                  );

                  setCustomPath("");

                  setPathPickerOpen(
                    false,
                  );
                }}
                selected={
                  !selectedPath &&
                  !customPath.trim()
                }
              />

              {existingKnowledgePaths.map(
                (path) => (
                  <PathOption
                    key={path.join("/")}
                    label={path.join(
                      " › ",
                    )}
                    onPress={() => {
                      setSelectedPath(
                        path,
                      );

                      setCustomPath(
                        "",
                      );

                      setPathPickerOpen(
                        false,
                      );
                    }}
                    selected={
                      selectedPath?.join(
                        "/",
                      ) ===
                      path.join("/")
                    }
                  />
                ),
              )}
            </ScrollView>
          ) : null}

          <View
            style={[
              styles.inputWrapper,
              styles.customPathWrapper,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .violet
              }
              name="create-outline"
              size={18}
            />

            <TextInput
              autoCapitalize="sentences"
              onChangeText={(value) => {
                setCustomPath(value);

                if (value.trim()) {
                  setSelectedPath(
                    null,
                  );
                }
              }}
              placeholder={
                labels.customPlaceholder
              }
              placeholderTextColor={
                universeTheme.colors
                  .textMuted
              }
              selectionColor={
                universeTheme.colors
                  .primaryBright
              }
              style={styles.input}
              value={customPath}
            />
          </View>

          <View
            style={
              styles.buttonContainer
            }
          >
            <SaveWiseButton
              disabled={!isValidUrl}
              icon="sparkles"
              label={labels.save}
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PathOption({
  label,
  onPress,
  selected,
}: {
  label: string;

  onPress: () => void;

  selected: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pathOption,

        pressed &&
          styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.pathOptionText,

          selected &&
            styles.pathOptionTextSelected,
        ]}
      >
        {label}
      </Text>

      {selected ? (
        <Ionicons
          color={
            universeTheme.colors
              .primaryBright
          }
          name="checkmark-circle"
          size={19}
        />
      ) : null}
    </Pressable>
  );
}

function resolvePreferredPath(
  selectedPath: string[] | null,
  customPath: string,
): string[] | undefined {
  if (selectedPath) {
    return selectedPath;
  }

  const parts =
    customPath
      .split(
        /\s*(?:›|>|\/|;)\s*/,
      )
      .map((part) =>
        part.trim(),
      )
      .filter(Boolean)
      .slice(0, 3);

  return parts.length > 0
    ? parts
    : undefined;
}

const captureLabels = {
  de: {
    cancel: "Abbrechen",

    newDiscovery:
      "Neue Discovery",

    link: "Link",

    invalidUrl:
      "Bitte gib eine gültige Webadresse ein.",

    detected:
      "SaveWise erkannt",

    save:
      "Analysieren und speichern",

    path:
      "Pfad im Wissensuniversum",

    pathHint:
      "Optional: Bestehenden Pfad wählen oder selbst eingeben.",

    automatic:
      "Automatisch durch KI",

    customPlaceholder:
      "Eigener Pfad, z. B. Reisen › Mittelmeer",
  },

  en: {
    cancel: "Cancel",

    newDiscovery:
      "New discovery",

    link: "Link",

    invalidUrl:
      "Please enter a valid web address.",

    detected:
      "SaveWise detected",

    save:
      "Analyze and save",

    path:
      "Knowledge universe path",

    pathHint:
      "Optional: choose an existing path or enter your own.",

    automatic:
      "Automatic by AI",

    customPlaceholder:
      "Custom path, e.g. Travel › Mediterranean",
  },

  fr: {
    cancel: "Annuler",

    newDiscovery:
      "Nouvelle découverte",

    link: "Lien",

    invalidUrl:
      "Saisissez une adresse web valide.",

    detected:
      "SaveWise a détecté",

    save:
      "Analyser et enregistrer",

    path:
      "Chemin de connaissance",

    pathHint:
      "Facultatif : choisissez un chemin ou saisissez le vôtre.",

    automatic:
      "Automatique par IA",

    customPlaceholder:
      "Chemin, p. ex. Voyages › Méditerranée",
  },

  it: {
    cancel: "Annulla",

    newDiscovery:
      "Nuova scoperta",

    link: "Link",

    invalidUrl:
      "Inserisci un indirizzo web valido.",

    detected:
      "SaveWise ha rilevato",

    save:
      "Analizza e salva",

    path:
      "Percorso della conoscenza",

    pathHint:
      "Facoltativo: scegli un percorso o inseriscine uno.",

    automatic:
      "Automatico con IA",

    customPlaceholder:
      "Percorso, es. Viaggi › Mediterraneo",
  },

  es: {
    cancel: "Cancelar",

    newDiscovery:
      "Nuevo descubrimiento",

    link: "Enlace",

    invalidUrl:
      "Introduce una dirección web válida.",

    detected:
      "SaveWise detectó",

    save:
      "Analizar y guardar",

    path:
      "Ruta de conocimiento",

    pathHint:
      "Opcional: elige una ruta o introduce una propia.",

    automatic:
      "Automático por IA",

    customPlaceholder:
      "Ruta, p. ej. Viajes › Mediterráneo",
  },
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
    backgroundColor:
      universeTheme.colors.background,

    flex: 1,
  },

  header: {
    alignItems: "center",

    borderBottomColor:
      universeTheme.colors.border,

    borderBottomWidth: 1,

    flexDirection: "row",

    justifyContent:
      "space-between",

    minHeight: 88,

    paddingHorizontal: 20,

    paddingTop: 18,
  },

  closeButton: {
    alignItems: "center",

    backgroundColor:
      "rgba(148, 163, 184, 0.08)",

    borderRadius: 999,

    height: 40,

    justifyContent: "center",

    width: 40,
  },

  headerCenter: {
    alignItems: "center",
  },

  eyebrow: {
    color:
      universeTheme.colors.primary,

    fontSize: 9,

    fontWeight: "800",

    letterSpacing: 1.5,
  },

  headerTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 17,

    fontWeight: "900",

    marginTop: 3,
  },

  headerSpacer: {
    width: 40,
  },

  content: {
    padding: 20,

    paddingBottom: 50,
  },

  introCard: {
    alignItems: "flex-start",

    backgroundColor:
      "rgba(6, 20, 36, 0.88)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    flexDirection: "row",

    gap: 13,

    marginBottom: 25,

    padding: 17,
  },

  introIcon: {
    alignItems: "center",

    backgroundColor:
      "rgba(56, 189, 248, 0.1)",

    borderColor:
      universeTheme.colors
        .borderStrong,

    borderRadius: 14,

    borderWidth: 1,

    height: 46,

    justifyContent: "center",

    width: 46,
  },

  flex: {
    flex: 1,
  },

  introTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 15,

    fontWeight: "900",
  },

  introText: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 12,

    lineHeight: 18,

    marginTop: 4,
  },

  label: {
    color:
      universeTheme.colors
        .primaryBright,

    fontSize: 11,

    fontWeight: "800",

    letterSpacing: 0.9,

    marginBottom: 8,

    textTransform: "uppercase",
  },

  inputWrapper: {
    alignItems: "center",

    backgroundColor:
      "rgba(6, 20, 36, 0.94)",

    borderColor:
      universeTheme.colors
        .borderStrong,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    flexDirection: "row",

    gap: 10,

    minHeight: 56,

    paddingHorizontal: 15,
  },

  input: {
    color:
      universeTheme.colors.text,

    flex: 1,

    fontSize: 14,

    lineHeight: 20,

    paddingVertical: 15,
  },

  validationRow: {
    alignItems: "center",

    flexDirection: "row",

    gap: 7,

    marginTop: 9,
  },

  validationText: {
    color:
      universeTheme.colors.danger,

    flex: 1,

    fontSize: 12,
  },

  preview: {
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",

    borderColor:
      "rgba(74, 222, 128, 0.28)",

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    marginTop: 18,

    padding: 17,
  },

  previewHeader: {
    alignItems: "center",

    flexDirection: "row",

    gap: 7,
  },

  previewLabel: {
    color:
      universeTheme.colors.green,

    fontSize: 10,

    fontWeight: "800",

    letterSpacing: 0.8,

    textTransform: "uppercase",
  },

  previewTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 18,

    fontWeight: "900",

    lineHeight: 24,

    marginTop: 13,
  },

  previewSource: {
    color:
      universeTheme.colors
        .primaryBright,

    fontSize: 12,

    fontWeight: "700",

    marginTop: 7,
  },

  previewUrl: {
    color:
      universeTheme.colors
        .textMuted,

    fontSize: 11,

    lineHeight: 16,

    marginTop: 8,
  },

  sectionHeader: {
    marginBottom: 11,

    marginTop: 30,
  },

  sectionEyebrow: {
    color:
      universeTheme.colors.violet,

    fontSize: 9,

    fontWeight: "800",

    letterSpacing: 1.4,
  },

  sectionTitle: {
    color:
      universeTheme.colors.text,

    fontSize: 18,

    fontWeight: "900",

    marginTop: 3,
  },

  sectionHint: {
    color:
      universeTheme.colors
        .textSecondary,

    fontSize: 12,

    lineHeight: 18,

    marginTop: 5,
  },

  pathSelect: {
    alignItems: "center",

    backgroundColor:
      "rgba(6, 20, 36, 0.94)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    flexDirection: "row",

    justifyContent:
      "space-between",

    minHeight: 56,

    paddingHorizontal: 15,
  },

  pathLeft: {
    alignItems: "center",

    flex: 1,

    flexDirection: "row",

    gap: 10,
  },

  pathSelectText: {
    color:
      universeTheme.colors.text,

    flex: 1,

    fontSize: 13,

    lineHeight: 18,

    marginRight: 8,
  },

  pathOptions: {
    backgroundColor:
      "rgba(6, 20, 36, 0.98)",

    borderColor:
      universeTheme.colors.border,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    marginTop: 7,

    maxHeight: 240,

    overflow: "hidden",
  },

  pathOption: {
    alignItems: "center",

    borderBottomColor:
      universeTheme.colors.border,

    borderBottomWidth:
      StyleSheet.hairlineWidth,

    flexDirection: "row",

    justifyContent:
      "space-between",

    minHeight: 50,

    paddingHorizontal: 15,
  },

  pathOptionText: {
    color:
      universeTheme.colors
        .textSecondary,

    flex: 1,

    fontSize: 12,

    lineHeight: 17,
  },

  pathOptionTextSelected: {
    color:
      universeTheme.colors
        .primaryBright,

    fontWeight: "800",
  },

  customPathWrapper: {
    borderColor:
      "rgba(139, 92, 246, 0.28)",

    marginTop: 10,
  },

  buttonContainer: {
    marginTop: 26,
  },

  pressed: {
    opacity: 0.68,
  },
});