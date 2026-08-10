import {
  Ionicons,
} from "@expo/vector-icons";

import * as DocumentPicker from "expo-document-picker";

import {
  Image,
} from "expo-image";

import * as ImagePicker from "expo-image-picker";

import type {
  Discovery,
} from "@savewise/shared";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  StarBackground,
} from "@/components/universe-ui/star-background";

import {
  isValidDiscoveryUrl,
  normalizeDiscoveryUrl,
} from "@/services/content-import-client";

import {
  importMobileFile,
  type MobileCaptureFile,
  type MobileCaptureType,
} from "@/services/file-capture-client";

import {
  resolveMetadata,
} from "@/services/metadata-resolver";

import {
  universeTheme,
} from "@/theme/universe-theme";

import {
  getGalaxyCandidates,
  type GalaxyCandidatePreview,
} from "@/services/content-import-client";

import type {
  CapturedItem,
} from "@/types/captured-item";

import {
  getMobileFileGalaxyCandidates,
} from "@/services/file-capture-client";

type CaptureMode =
  | "menu"
  | "link"
  | "pdf"
  | "image";

type CaptureModalProps = {
  visible:
    boolean;

  existingMainTopics:
    string[];

  onClose:
    () => void;

  onSave: (
    capturedItem:
      CapturedItem,
  ) => void;

  onFileImported?: (
    discovery:
      Discovery,
  ) => void | Promise<void>;
};

type CaptureOption = {
  id:
    | "link"
    | "camera"
    | "library"
    | "pdf"
    | "voice"
    | "note";

  title:
    string;

  description:
    string;

  icon:
    keyof typeof Ionicons.glyphMap;

  enabled:
    boolean;
};

const OPTIONS:
CaptureOption[] = [
  {
    id:
      "link",

    title:
      "Link speichern",

    description:
      "Webseiten, Videos und Online-Quellen analysieren.",

    icon:
      "link-outline",

    enabled:
      true,
  },

  {
    id:
      "camera",

    title:
      "Foto aufnehmen",

    description:
      "Dokument, Whiteboard, Bildschirm oder Objekt direkt fotografieren.",

    icon:
      "camera-outline",

    enabled:
      true,
  },

  {
    id:
      "library",

    title:
      "Bild auswählen",

    description:
      "Screenshot oder Foto aus deiner Mediathek analysieren.",

    icon:
      "images-outline",

    enabled:
      true,
  },

  {
    id:
      "pdf",

    title:
      "PDF importieren",

    description:
      "Dokument auswählen, analysieren und mit deinem Wissen verbinden.",

    icon:
      "document-text-outline",

    enabled:
      true,
  },

  {
    id:
      "voice",

    title:
      "Spracheingabe",

    description:
      "Gedanken einsprechen und automatisch strukturieren.",

    icon:
      "mic-outline",

    enabled:
      false,
  },

  {
    id:
      "note",

    title:
      "Schnellnotiz",

    description:
      "Gedanken und Beobachtungen direkt festhalten.",

    icon:
      "create-outline",

    enabled:
      false,
  },
];

export function CaptureModal({
  visible,
  existingMainTopics,
  onClose,
  onSave,
  onFileImported,
}: CaptureModalProps) {
  const [
    mode,
    setMode,
  ] =
    useState<CaptureMode>(
      "menu",
    );

  const [
    url,
    setUrl,
  ] =
    useState("");

  const [
    knowledgePath,
    setKnowledgePath,
  ] =
    useState("");


  const [
    galaxyCandidates,
    setGalaxyCandidates,
  ] =
    useState<
      GalaxyCandidatePreview[]
    >([]);

  const [
    selectedGalaxy,
    setSelectedGalaxy,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isLoadingGalaxyCandidates,
    setLoadingGalaxyCandidates,
  ] =
    useState(false);

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<
      MobileCaptureFile | null
    >(null);

  const [
    selectedCaptureType,
    setSelectedCaptureType,
  ] =
    useState<
      MobileCaptureType | null
    >(null);

  const [
    isImporting,
    setImporting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    if (!visible) {
      reset();
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

  const validUrl =
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
        validUrl
          ? resolveMetadata(
              normalizedUrl,
            )
          : null,
      [
        validUrl,
        normalizedUrl,
      ],
    );

  const suggestedTopics =
    useMemo(
      () =>
        [...new Set(
          existingMainTopics
            .map(
              (topic) =>
                topic.trim(),
            )
            .filter(Boolean),
        )].slice(
          0,
          8,
        ),
      [existingMainTopics],
    );

  async function loadGalaxyCandidates() {
    if (
      !validUrl ||
      isLoadingGalaxyCandidates
    ) {
      return;
    }

    setLoadingGalaxyCandidates(
      true,
    );

    setError(null);

    try {
      const candidates =
        await getGalaxyCandidates(
          normalizedUrl,
        );

      setGalaxyCandidates(
        candidates,
      );

      setSelectedGalaxy(
        null,
      );

      setKnowledgePath("");
    } catch (
      candidateError
    ) {
      setError(
        candidateError instanceof Error
          ? candidateError.message
          : "Galaxien konnten nicht vorgeschlagen werden.",
      );
    } finally {
      setLoadingGalaxyCandidates(
        false,
      );
    }
  }

  function selectGalaxy(
    galaxy:
      string | null,
  ) {
    setSelectedGalaxy(
      galaxy,
    );

    setKnowledgePath(
      galaxy ?? "",
    );
  }

  function reset() {
    setMode(
      "menu",
    );

    setUrl("");
    setKnowledgePath("");
    setGalaxyCandidates([]);
    setSelectedGalaxy(null);
    setLoadingGalaxyCandidates(
      false,
    );
    setSelectedFile(null);
    setSelectedCaptureType(
      null,
    );
    setImporting(false);
    setError(null);
  }

  function close() {
    if (
      isImporting
    ) {
      return;
    }

    reset();
    onClose();
  }

  function back() {
    if (
      isImporting
    ) {
      return;
    }

    setMode(
      "menu",
    );

    setSelectedFile(
      null,
    );

    setSelectedCaptureType(
      null,
    );

    setError(null);
  }

  function parsedKnowledgePath():
  string[] | undefined {
    const parts =
      knowledgePath
        .split(">")
        .map(
          (part) =>
            part.trim(),
        )
        .filter(Boolean)
        .slice(
          0,
          3,
        );

    return parts.length >
      0
      ? parts
      : undefined;
  }

  function saveLink() {
    if (
      !validUrl ||
      !metadata
    ) {
      setError(
        "Bitte gib eine gültige Internetadresse ein.",
      );

      return;
    }

    const capturedItem:
      CapturedItem = {
      id:
        Date.now()
          .toString(),

      title:
        metadata.title,

      url:
        normalizedUrl,

      source:
        metadata.source,

      capturedAt:
        new Date()
          .toISOString(),

      preferredKnowledgePath:
        parsedKnowledgePath(),
    };

    onSave(
      capturedItem,
    );
  }

  async function selectPdf() {
    setError(null);

    try {
      const result =
        await DocumentPicker
          .getDocumentAsync({
            type:
              "application/pdf",

            copyToCacheDirectory:
              true,

            multiple:
              false,
          });

      if (
        result.canceled ||
        !result.assets[0]
      ) {
        return;
      }

      const asset =
        result.assets[0];

      if (
        typeof asset.size ===
          "number" &&
        asset.size >
          25 *
          1024 *
          1024
      ) {
        setError(
          "Das PDF darf maximal 25 MB groß sein.",
        );

        return;
      }

      setSelectedCaptureType(
        "pdf",
      );

      setSelectedFile({
        uri:
          asset.uri,

        fileName:
          asset.name ||
          `SaveWise-${Date.now()}.pdf`,

        mimeType:
          asset.mimeType ||
          "application/pdf",

        sizeBytes:
          asset.size,
      });

      setMode(
        "pdf",
      );
    } catch (
      pickerError
    ) {
      setError(
        getErrorMessage(
          pickerError,
          "Das PDF konnte nicht ausgewählt werden.",
        ),
      );
    }
  }

  async function selectImage() {
    setError(null);

    try {
      const currentPermission =
        await ImagePicker
          .getMediaLibraryPermissionsAsync();

      let granted =
        currentPermission.granted;

      if (!granted) {
        const requestedPermission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        granted =
          requestedPermission.granted;
      }

      if (!granted) {
        Alert.alert(
          "Zugriff auf Fotos erforderlich",
          "Aktiviere den Fotozugriff für SaveWise in den iPhone-Einstellungen.",
          [
            {
              text:
                "Abbrechen",
              style:
                "cancel",
            },
            {
              text:
                "Einstellungen öffnen",
              onPress() {
                void Linking.openSettings();
              },
            },
          ],
        );

        return;
      }

      const result =
        await ImagePicker
          .launchImageLibraryAsync({
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,

            allowsEditing:
              false,

            allowsMultipleSelection:
              false,

            quality:
              1,
          });

      if (
        result.canceled ||
        !result.assets[0]
      ) {
        return;
      }

      prepareImage(
        result.assets[0],
        "library",
      );
    } catch (
      pickerError
    ) {
      const message =
        getErrorMessage(
          pickerError,
          "Das Bild konnte nicht ausgewählt werden.",
        );

      setError(message);

      Alert.alert(
        "Bildauswahl fehlgeschlagen",
        message,
      );
    }
  }

  async function takePhoto() {
    setError(null);

    try {
      const available =
        await ImagePicker
          .getCameraPermissionsAsync();

      let granted =
        available.granted;

      if (!granted) {
        const requested =
          await ImagePicker
            .requestCameraPermissionsAsync();

        granted =
          requested.granted;
      }

      if (!granted) {
        Alert.alert(
          "Kamerazugriff erforderlich",
          "Aktiviere den Kamerazugriff für SaveWise in den iPhone-Einstellungen.",
          [
            {
              text:
                "Abbrechen",
              style:
                "cancel",
            },
            {
              text:
                "Einstellungen öffnen",
              onPress() {
                void Linking.openSettings();
              },
            },
          ],
        );

        return;
      }

      const result =
        await ImagePicker
          .launchCameraAsync({
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,

            allowsEditing:
              false,

            quality:
              0.92,

            exif:
              false,
          });

      if (
        result.canceled ||
        !result.assets[0]
      ) {
        return;
      }

      prepareImage(
        result.assets[0],
        "camera",
      );
    } catch (
      cameraError
    ) {
      const message =
        getErrorMessage(
          cameraError,
          "Die Kamera konnte nicht geöffnet werden.",
        );

      setError(message);

      Alert.alert(
        "Kamera konnte nicht geöffnet werden",
        message,
      );
    }
  }

  function prepareImage(
    asset:
      ImagePicker.ImagePickerAsset,

    origin:
      "camera"
      | "library",
  ) {
    if (
      typeof asset.fileSize ===
        "number" &&
      asset.fileSize >
        15 *
        1024 *
        1024
    ) {
      setError(
        "Das Bild darf maximal 15 MB groß sein.",
      );

      return;
    }

    const mimeType =
      resolveImageMimeType(
        asset,
      );

    const extension =
      resolveImageExtension(
        mimeType,
      );

    const fileName =
      asset.fileName ||
      `SaveWise-${
        origin ===
          "camera"
          ? "Foto"
          : "Bild"
      }-${Date.now()}.${extension}`;

    setSelectedFile({
      uri:
        asset.uri,

      fileName,

      mimeType,

      sizeBytes:
        asset.fileSize,
    });

    setSelectedCaptureType(
      "image",
    );

    setMode(
      "image",
    );
  }

  async function loadSelectedFileGalaxyCandidates() {
    if (
      !selectedFile ||
      !selectedCaptureType ||
      isLoadingGalaxyCandidates
    ) {
      return;
    }

    setLoadingGalaxyCandidates(
      true,
    );

    setError(
      null,
    );

    try {
      const candidates =
        await getMobileFileGalaxyCandidates({
          file:
            selectedFile,

          captureType:
            selectedCaptureType,
        });

      setGalaxyCandidates(
        candidates,
      );

      /*
       * Standard bleibt:
       * KI darf automatisch entscheiden.
       */
      setSelectedGalaxy(
        null,
      );

      setKnowledgePath(
        "",
      );
    } catch (
      candidateError
    ) {
      setError(
        getErrorMessage(
          candidateError,
          "Die passenden Galaxien konnten nicht ermittelt werden.",
        ),
      );
    } finally {
      setLoadingGalaxyCandidates(
        false,
      );
    }
  }

  async function importSelectedFile() {
    if (
      !selectedFile ||
      !selectedCaptureType
    ) {
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const discovery =
        await importMobileFile({
          file:
            selectedFile,

          captureType:
            selectedCaptureType,

          preferredKnowledgePath:
            parsedKnowledgePath(),
        });

      if (
        onFileImported
      ) {
        await onFileImported(
          discovery,
        );
      }

      reset();
      onClose();
    } catch (
      importError
    ) {
      setError(
        getErrorMessage(
          importError,
          "Die Datei konnte nicht importiert werden.",
        ),
      );
    } finally {
      setImporting(false);
    }
  }

  function chooseOption(
    option:
      CaptureOption,
  ) {
    if (
      !option.enabled
    ) {
      return;
    }

    switch (
      option.id
    ) {
      case "link":
        setMode(
          "link",
        );
        return;

      case "camera":
        void takePhoto();
        return;

      case "library":
        void selectImage();
        return;

      case "pdf":
        void selectPdf();
        return;

      default:
        return;
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={
        close
      }
      presentationStyle="pageSheet"
      visible={
        visible
      }
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS ===
          "ios"
            ? "padding"
            : undefined
        }
        style={
          styles.screen
        }
      >
        <StarBackground
          density={55}
        />

        <View style={styles.header}>
          {mode ===
          "menu" ? (
            <Pressable
              accessibilityLabel="Schließen"
              hitSlop={10}
              onPress={
                close
              }
              style={
                styles.headerButton
              }
            >
              <Ionicons
                color={
                  universeTheme
                    .colors
                    .textSecondary
                }
                name="close"
                size={22}
              />
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Zurück"
              disabled={
                isImporting
              }
              hitSlop={10}
              onPress={
                back
              }
              style={
                styles.headerButton
              }
            >
              <Ionicons
                color={
                  universeTheme
                    .colors
                    .textSecondary
                }
                name="arrow-back"
                size={22}
              />
            </Pressable>
          )}

          <View style={styles.headerCenter}>
            <Text style={styles.eyebrow}>
              CAPTURE
            </Text>

            <Text style={styles.headerTitle}>
              {mode ===
              "menu"
                ? "Neues Wissen"
                : mode ===
                    "link"
                  ? "Link speichern"
                  : mode ===
                      "pdf"
                    ? "PDF importieren"
                    : "Bild analysieren"}
            </Text>
          </View>

          <View style={styles.headerButton} />
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
          {mode ===
          "menu" ? (
            <>
              <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                  <Ionicons
                    color={
                      universeTheme
                        .colors
                        .primaryBright
                    }
                    name="sparkles"
                    size={27}
                  />
                </View>

                <View style={styles.flex}>
                  <Text style={styles.heroTitle}>
                    Capture Hub
                  </Text>

                  <Text style={styles.heroText}>
                    Erfasse Wissen dort,
                    wo es entsteht. SaveWise
                    analysiert und verbindet
                    den Inhalt automatisch
                    mit deinem Universum.
                  </Text>
                </View>
              </View>

              <View style={styles.optionGrid}>
                {OPTIONS.map(
                  (option) => (
                    <Pressable
                      disabled={
                        !option.enabled
                      }
                      key={
                        option.id
                      }
                      onPress={() => {
                        chooseOption(
                          option,
                        );
                      }}
                      style={({ pressed }) => [
                        styles.optionCard,

                        !option.enabled &&
                          styles.optionDisabled,

                        pressed &&
                          option.enabled &&
                          styles.optionPressed,
                      ]}
                    >
                      <View style={styles.optionIcon}>
                        <Ionicons
                          color={
                            option.enabled
                              ? universeTheme
                                  .colors
                                  .primaryBright
                              : universeTheme
                                  .colors
                                  .textMuted
                          }
                          name={
                            option.icon
                          }
                          size={24}
                        />
                      </View>

                      <View style={styles.optionContent}>
                        <View style={styles.optionTitleRow}>
                          <Text style={styles.optionTitle}>
                            {
                              option.title
                            }
                          </Text>

                          {!option.enabled ? (
                            <View style={styles.soonBadge}>
                              <Text style={styles.soonText}>
                                BALD
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={styles.optionDescription}>
                          {
                            option.description
                          }
                        </Text>
                      </View>

                      {option.enabled ? (
                        <Ionicons
                          color={
                            universeTheme
                              .colors
                              .textMuted
                          }
                          name="chevron-forward"
                          size={18}
                        />
                      ) : null}
                    </Pressable>
                  ),
                )}
              </View>
            </>
          ) : null}

          {mode ===
          "link" ? (
            <View style={styles.form}>
              <CaptureIntro
                description="SaveWise liest die Quelle, analysiert den Inhalt und ordnet ihn deinem Wissen zu."
                icon="link-outline"
                title="Online-Quelle"
              />

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>
                  Internetadresse
                </Text>

                <TextInput
                  autoCapitalize="none"
                  autoCorrect={
                    false
                  }
                  keyboardType="url"
                  onChangeText={
                    setUrl
                  }
                  placeholder="https://..."
                  placeholderTextColor={
                    universeTheme
                      .colors
                      .textMuted
                  }
                  style={styles.input}
                  value={url}
                />
              </View>

              {metadata &&
              validUrl ? (
                <View style={styles.previewCard}>
                  <Ionicons
                    color={
                      universeTheme
                        .colors
                        .primaryBright
                    }
                    name="checkmark-circle"
                    size={21}
                  />

                  <View style={styles.flex}>
                    <Text style={styles.previewTitle}>
                      {
                        metadata.title
                      }
                    </Text>

                    <Text style={styles.previewMeta}>
                      Quelle erkannt
                    </Text>
                  </View>
                </View>
              ) : null}

              <View
                style={
                  styles.galaxySelectionCard
                }
              >
                <View
                  style={
                    styles.galaxySelectionHeader
                  }
                >
                  <View
                    style={
                      styles.flex
                    }
                  >
                    <Text
                      style={
                        styles.galaxySelectionEyebrow
                      }
                    >
                      CLASSIFICATION V3
                    </Text>

                    <Text
                      style={
                        styles.galaxySelectionTitle
                      }
                    >
                      Galaxie festlegen
                    </Text>

                    <Text
                      style={
                        styles.galaxySelectionText
                      }
                    >
                      SaveWise sucht passende
                      bestehende Galaxien und
                      vermeidet unnötige neue
                      Kategorien.
                    </Text>
                  </View>

                  <Pressable
                    disabled={
                      !validUrl ||
                      isLoadingGalaxyCandidates
                    }
                    onPress={() => {
                      void loadGalaxyCandidates();
                    }}
                    style={[
                      styles.galaxyCheckButton,

                      (
                        !validUrl ||
                        isLoadingGalaxyCandidates
                      ) &&
                        styles.buttonDisabled,
                    ]}
                  >
                    {isLoadingGalaxyCandidates ? (
                      <ActivityIndicator
                        color={
                          universeTheme
                            .colors
                            .primaryBright
                        }
                        size="small"
                      />
                    ) : (
                      <Ionicons
                        color={
                          universeTheme
                            .colors
                            .primaryBright
                        }
                        name="sparkles-outline"
                        size={16}
                      />
                    )}

                    <Text
                      style={
                        styles.galaxyCheckButtonText
                      }
                    >
                      Prüfen
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => {
                    selectGalaxy(
                      null,
                    );
                  }}
                  style={[
                    styles.galaxyOption,

                    selectedGalaxy ===
                      null &&
                      styles.galaxyOptionActive,
                  ]}
                >
                  <Ionicons
                    color={
                      selectedGalaxy ===
                        null
                        ? universeTheme
                            .colors
                            .primaryBright
                        : universeTheme
                            .colors
                            .textMuted
                    }
                    name={
                      selectedGalaxy ===
                        null
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={19}
                  />

                  <View
                    style={
                      styles.flex
                    }
                  >
                    <Text
                      style={
                        styles.galaxyOptionTitle
                      }
                    >
                      Galaxie automatisch bestimmen
                    </Text>

                    <Text
                      style={
                        styles.galaxyOptionMeta
                      }
                    >
                      KI entscheidet anhand
                      des Inhalts.
                    </Text>
                  </View>
                </Pressable>

                {galaxyCandidates.map(
                  (
                    candidate,
                    index,
                  ) => {
                    const active =
                      selectedGalaxy ===
                      candidate.galaxy;

                    return (
                      <Pressable
                        key={
                          candidate.galaxy
                        }
                        onPress={() => {
                          selectGalaxy(
                            candidate.galaxy,
                          );
                        }}
                        style={[
                          styles.galaxyOption,

                          active &&
                            styles.galaxyOptionActive,
                        ]}
                      >
                        <Ionicons
                          color={
                            active
                              ? universeTheme
                                  .colors
                                  .primaryBright
                              : universeTheme
                                  .colors
                                  .textMuted
                          }
                          name={
                            active
                              ? "radio-button-on"
                              : "radio-button-off"
                          }
                          size={19}
                        />

                        <View
                          style={
                            styles.flex
                          }
                        >
                          <Text
                            style={
                              styles.galaxyOptionTitle
                            }
                          >
                            {candidate.galaxy}
                          </Text>

                          <Text
                            style={
                              styles.galaxyOptionMeta
                            }
                          >
                            Vorschlag {
                              index + 1
                            } · {
                              Math.round(
                                candidate.score *
                                100,
                              )
                            } %
                          </Text>
                        </View>
                      </Pressable>
                    );
                  },
                )}
              </View>

              <KnowledgePathField
                onChange={
                  setKnowledgePath
                }
                suggestions={
                  suggestedTopics
                }
                value={
                  knowledgePath
                }
              />

              {error ? (
                <ErrorBox
                  message={
                    error
                  }
                />
              ) : null}

              <Pressable
                disabled={
                  !validUrl ||
                  !metadata
                }
                onPress={
                  saveLink
                }
                style={[
                  styles.primaryButton,

                  (!validUrl ||
                    !metadata) &&
                    styles.buttonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  Analysieren und speichern
                </Text>

                <Ionicons
                  color="#03131D"
                  name="sparkles"
                  size={17}
                />
              </Pressable>
            </View>
          ) : null}

          {(mode ===
            "pdf" ||
            mode ===
              "image") &&
          selectedFile ? (
            <View style={styles.form}>
              <CaptureIntro
                description={
                  mode ===
                  "pdf"
                    ? "Text und Struktur werden extrahiert, von der KI analysiert und anschließend in Dropbox gesichert."
                    : "SaveWise analysiert sichtbaren Text, Diagramme, Objekte und fachliche Zusammenhänge."
                }
                icon={
                  mode ===
                  "pdf"
                    ? "document-text-outline"
                    : "image-outline"
                }
                title={
                  mode ===
                  "pdf"
                    ? "Dokument bereit"
                    : "Bild bereit"
                }
              />

              {mode ===
              "image" ? (
                <View style={styles.imagePreview}>
                  <Image
                    contentFit="contain"
                    source={{
                      uri:
                        selectedFile.uri,
                    }}
                    style={
                      styles.previewImage
                    }
                  />
                </View>
              ) : (
                <View style={styles.pdfPreview}>
                  <View style={styles.pdfIcon}>
                    <Ionicons
                      color={
                        universeTheme
                          .colors
                          .primaryBright
                      }
                      name="document-text"
                      size={34}
                    />
                  </View>

                  <View style={styles.flex}>
                    <Text
                      numberOfLines={2}
                      style={styles.fileName}
                    >
                      {
                        selectedFile
                          .fileName
                      }
                    </Text>

                    <Text style={styles.fileMeta}>
                      PDF
                      {selectedFile.sizeBytes
                        ? ` · ${formatFileSize(
                            selectedFile.sizeBytes,
                          )}`
                        : ""}
                    </Text>
                  </View>
                </View>
              )}

              {mode ===
              "image" ? (
                <View style={styles.imageActions}>
                  <Pressable
                    disabled={
                      isImporting
                    }
                    onPress={() => {
                      void takePhoto();
                    }}
                    style={styles.secondaryButton}
                  >
                    <Ionicons
                      color={
                        universeTheme
                          .colors
                          .primaryBright
                      }
                      name="camera-outline"
                      size={17}
                    />

                    <Text style={styles.secondaryButtonText}>
                      Neu aufnehmen
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={
                      isImporting
                    }
                    onPress={() => {
                      void selectImage();
                    }}
                    style={styles.secondaryButton}
                  >
                    <Ionicons
                      color={
                        universeTheme
                          .colors
                          .primaryBright
                      }
                      name="images-outline"
                      size={17}
                    />

                    <Text style={styles.secondaryButtonText}>
                      Anderes Bild
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  disabled={
                    isImporting
                  }
                  onPress={() => {
                    void selectPdf();
                  }}
                  style={styles.secondaryButtonFull}
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors
                        .primaryBright
                    }
                    name="folder-open-outline"
                    size={17}
                  />

                  <Text style={styles.secondaryButtonText}>
                    Anderes PDF wählen
                  </Text>
                </Pressable>
              )}

              <View
                style={
                  styles.galaxySelectionCard
                }
              >
                <View
                  style={
                    styles.galaxySelectionHeader
                  }
                >
                  <View
                    style={
                      styles.flex
                    }
                  >
                    <Text
                      style={
                        styles.galaxySelectionEyebrow
                      }
                    >
                      CLASSIFICATION V3
                    </Text>

                    <Text
                      style={
                        styles.galaxySelectionTitle
                      }
                    >
                      Galaxie festlegen
                    </Text>

                    <Text
                      style={
                        styles.galaxySelectionText
                      }
                    >
                      SaveWise analysiert die
                      Datei und schlägt passende
                      bestehende Galaxien vor.
                    </Text>
                  </View>

                  <Pressable
                    disabled={
                      isImporting ||
                      isLoadingGalaxyCandidates
                    }
                    onPress={() => {
                      void loadSelectedFileGalaxyCandidates();
                    }}
                    style={[
                      styles.galaxyCheckButton,

                      (
                        isImporting ||
                        isLoadingGalaxyCandidates
                      ) &&
                        styles.buttonDisabled,
                    ]}
                  >
                    {isLoadingGalaxyCandidates ? (
                      <ActivityIndicator
                        color={
                          universeTheme
                            .colors
                            .primaryBright
                        }
                        size="small"
                      />
                    ) : (
                      <Ionicons
                        color={
                          universeTheme
                            .colors
                            .primaryBright
                        }
                        name="sparkles-outline"
                        size={16}
                      />
                    )}

                    <Text
                      style={
                        styles.galaxyCheckButtonText
                      }
                    >
                      Datei mit KI prüfen
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => {
                    selectGalaxy(
                      null,
                    );
                  }}
                  style={[
                    styles.galaxyOption,

                    selectedGalaxy ===
                      null &&
                      styles.galaxyOptionActive,
                  ]}
                >
                  <Ionicons
                    color={
                      selectedGalaxy ===
                        null
                        ? universeTheme
                            .colors
                            .primaryBright
                        : universeTheme
                            .colors
                            .textMuted
                    }
                    name={
                      selectedGalaxy ===
                        null
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={19}
                  />

                  <View
                    style={
                      styles.flex
                    }
                  >
                    <Text
                      style={
                        styles.galaxyOptionTitle
                      }
                    >
                      KI entscheiden lassen
                    </Text>

                    <Text
                      style={
                        styles.galaxyOptionMeta
                      }
                    >
                      SaveWise ordnet die Datei
                      automatisch ein.
                    </Text>
                  </View>
                </Pressable>

                {galaxyCandidates.map(
                  (
                    candidate,
                    index,
                  ) => {
                    const active =
                      selectedGalaxy ===
                      candidate.galaxy;

                    return (
                      <Pressable
                        key={
                          candidate.galaxy
                        }
                        onPress={() => {
                          selectGalaxy(
                            candidate.galaxy,
                          );
                        }}
                        style={[
                          styles.galaxyOption,

                          active &&
                            styles.galaxyOptionActive,
                        ]}
                      >
                        <Ionicons
                          color={
                            active
                              ? universeTheme
                                  .colors
                                  .primaryBright
                              : universeTheme
                                  .colors
                                  .textMuted
                          }
                          name={
                            active
                              ? "radio-button-on"
                              : "radio-button-off"
                          }
                          size={19}
                        />

                        <View
                          style={
                            styles.flex
                          }
                        >
                          <Text
                            style={
                              styles.galaxyOptionTitle
                            }
                          >
                            {candidate.galaxy}
                          </Text>

                          <Text
                            style={
                              styles.galaxyOptionMeta
                            }
                          >
                            Vorschlag {
                              index + 1
                            } · {
                              Math.round(
                                candidate.score *
                                100,
                              )
                            } %
                          </Text>
                        </View>
                      </Pressable>
                    );
                  },
                )}
              </View>

              <KnowledgePathField
                onChange={
                  setKnowledgePath
                }
                suggestions={
                  suggestedTopics
                }
                value={
                  knowledgePath
                }
              />

              {error ? (
                <ErrorBox
                  message={
                    error
                  }
                />
              ) : null}

              {isImporting ? (
                <View style={styles.analysisCard}>
                  <ActivityIndicator
                    color={
                      universeTheme
                        .colors
                        .primaryBright
                    }
                    size="small"
                  />

                  <View style={styles.flex}>
                    <Text style={styles.analysisTitle}>
                      SaveWise analysiert …
                    </Text>

                    <Text style={styles.analysisText}>
                      KI-Analyse,
                      Wissenszuordnung und
                      Dropbox-Sicherung
                      laufen.
                    </Text>
                  </View>
                </View>
              ) : null}

              <Pressable
                disabled={
                  isImporting
                }
                onPress={() => {
                  void importSelectedFile();
                }}
                style={[
                  styles.primaryButton,

                  isImporting &&
                    styles.buttonDisabled,
                ]}
              >
                {isImporting ? (
                  <ActivityIndicator
                    color="#03131D"
                    size="small"
                  />
                ) : (
                  <Ionicons
                    color="#03131D"
                    name="sparkles"
                    size={17}
                  />
                )}

                <Text style={styles.primaryButtonText}>
                  {isImporting
                    ? "Analysiere …"
                    : mode ===
                        "pdf"
                      ? "PDF analysieren"
                      : "Bild analysieren"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CaptureIntro({
  icon,
  title,
  description,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;

  title:
    string;

  description:
    string;
}) {
  return (
    <View style={styles.introCard}>
      <View style={styles.introIcon}>
        <Ionicons
          color={
            universeTheme.colors
              .primaryBright
          }
          name={icon}
          size={23}
        />
      </View>

      <View style={styles.flex}>
        <Text style={styles.introTitle}>
          {title}
        </Text>

        <Text style={styles.introText}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function KnowledgePathField({
  value,
  suggestions,
  onChange,
}: {
  value:
    string;

  suggestions:
    string[];

  onChange:
    (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeading}>
        <Text style={styles.fieldLabel}>
          Wissenspfad
        </Text>

        <Text style={styles.optional}>
          OPTIONAL
        </Text>
      </View>

      <TextInput
        autoCapitalize="sentences"
        onChangeText={
          onChange
        }
        placeholder="z.B. Maschinenbau > Werkstoffe > Leichtbau"
        placeholderTextColor={
          universeTheme.colors
            .textMuted
        }
        style={styles.input}
        value={value}
      />

      <Text style={styles.fieldHelp}>
        Leer lassen = SaveWise ordnet den
        Inhalt vollständig automatisch ein.
      </Text>

      {suggestions.length >
      0 ? (
        <ScrollView
          contentContainerStyle={
            styles.suggestionRow
          }
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
        >
          {suggestions.map(
            (topic) => (
              <Pressable
                key={topic}
                onPress={() => {
                  onChange(
                    topic,
                  );
                }}
                style={styles.suggestionChip}
              >
                <Text
                  numberOfLines={1}
                  style={styles.suggestionText}
                >
                  {topic}
                </Text>
              </Pressable>
            ),
          )}
        </ScrollView>
      ) : null}
    </View>
  );
}

function ErrorBox({
  message,
}: {
  message:
    string;
}) {
  return (
    <View style={styles.errorBox}>
      <Ionicons
        color={
          universeTheme.colors
            .danger
        }
        name="alert-circle-outline"
        size={19}
      />

      <Text style={styles.errorText}>
        {message}
      </Text>
    </View>
  );
}

function resolveImageMimeType(
  asset:
    ImagePicker.ImagePickerAsset,
): string {
  if (
    asset.mimeType &&
    [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(
      asset.mimeType,
    )
  ) {
    return asset.mimeType;
  }

  const uri =
    asset.uri.toLowerCase();

  if (
    uri.endsWith(
      ".png",
    )
  ) {
    return "image/png";
  }

  if (
    uri.endsWith(
      ".webp",
    )
  ) {
    return "image/webp";
  }

  return "image/jpeg";
}

function resolveImageExtension(
  mimeType:
    string,
): string {
  if (
    mimeType ===
    "image/png"
  ) {
    return "png";
  }

  if (
    mimeType ===
    "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}

function formatFileSize(
  bytes:
    number,
): string {
  if (
    bytes <
    1024 *
      1024
  ) {
    return `${Math.max(
      1,
      Math.round(
        bytes /
        1024,
      ),
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

function getErrorMessage(
  error:
    unknown,

  fallback:
    string,
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

const styles =
  StyleSheet.create({
    screen: {
      backgroundColor:
        universeTheme.colors
          .background,

      flex:
        1,
    },

    header: {
      alignItems:
        "center",

      borderBottomColor:
        universeTheme.colors
          .border,

      borderBottomWidth:
        StyleSheet
          .hairlineWidth,

      flexDirection:
        "row",

      minHeight:
        74,

      paddingHorizontal:
        16,

      paddingTop:
        7,
    },

    headerButton: {
      alignItems:
        "center",

      height:
        42,

      justifyContent:
        "center",

      width:
        42,
    },

    headerCenter: {
      alignItems:
        "center",

      flex:
        1,
    },

    eyebrow: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        9,

      fontWeight:
        "900",

      letterSpacing:
        1.2,
    },

    headerTitle: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        20,

      fontWeight:
        "800",

      marginTop:
        2,
    },

    content: {
      gap:
        16,

      padding:
        16,

      paddingBottom:
        50,
    },

    heroCard: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.06)",

      borderColor:
        "rgba(115, 216, 255, 0.16)",

      borderRadius:
        17,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        14,

      padding:
        16,
    },

    heroIcon: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.1)",

      borderRadius:
        13,

      height:
        52,

      justifyContent:
        "center",

      width:
        52,
    },

    heroTitle: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        17,

      fontWeight:
        "800",
    },

    heroText: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        12,

      lineHeight:
        18,

      marginTop:
        4,
    },

    optionGrid: {
      gap:
        10,
    },

    optionCard: {
      alignItems:
        "center",

      backgroundColor:
        universeTheme.colors
          .surfaceStrong,

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        15,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        12,

      minHeight:
        88,

      padding:
        14,
    },

    optionPressed: {
      backgroundColor:
        "rgba(56, 189, 248, 0.08)",

      borderColor:
        universeTheme.colors
          .primaryBright,
    },

    optionDisabled: {
      opacity:
        0.45,
    },

    optionIcon: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.075)",

      borderRadius:
        12,

      height:
        48,

      justifyContent:
        "center",

      width:
        48,
    },

    optionContent: {
      flex:
        1,
    },

    optionTitleRow: {
      alignItems:
        "center",

      flexDirection:
        "row",

      gap:
        7,
    },

    optionTitle: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        15,

      fontWeight:
        "800",
    },

    optionDescription: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        11,

      lineHeight:
        16,

      marginTop:
        4,
    },

    soonBadge: {
      backgroundColor:
        "rgba(139, 92, 246, 0.1)",

      borderColor:
        "rgba(139, 92, 246, 0.25)",

      borderRadius:
        999,

      borderWidth:
        1,

      paddingHorizontal:
        6,

      paddingVertical:
        3,
    },

    soonText: {
      color:
        universeTheme.colors
          .violet,

      fontSize:
        7,

      fontWeight:
        "900",
    },

    form: {
      gap:
        15,
    },

    introCard: {
      alignItems:
        "flex-start",

      backgroundColor:
        "rgba(8, 24, 39, 0.82)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        15,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        12,

      padding:
        14,
    },

    introIcon: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.08)",

      borderRadius:
        11,

      height:
        44,

      justifyContent:
        "center",

      width:
        44,
    },

    introTitle: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        15,

      fontWeight:
        "800",
    },

    introText: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        11,

      lineHeight:
        17,

      marginTop:
        4,
    },

    field: {
      gap:
        8,
    },

    fieldHeading: {
      alignItems:
        "center",

      flexDirection:
        "row",

      justifyContent:
        "space-between",
    },

    fieldLabel: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        12,

      fontWeight:
        "800",
    },

    optional: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        8,

      fontWeight:
        "900",

      letterSpacing:
        0.7,
    },

    input: {
      backgroundColor:
        "rgba(3, 13, 24, 0.78)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        12,

      borderWidth:
        1,

      color:
        universeTheme.colors
          .text,

      fontSize:
        14,

      minHeight:
        50,

      paddingHorizontal:
        13,
    },

    fieldHelp: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        10,

      lineHeight:
        15,
    },

    suggestionRow: {
      gap:
        7,

      paddingRight:
        16,
    },

    suggestionChip: {
      backgroundColor:
        "rgba(56, 189, 248, 0.05)",

      borderColor:
        "rgba(115, 216, 255, 0.13)",

      borderRadius:
        999,

      borderWidth:
        1,

      maxWidth:
        190,

      paddingHorizontal:
        10,

      paddingVertical:
        7,
    },

    suggestionText: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        10,

      fontWeight:
        "700",
    },

    previewCard: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(74, 222, 128, 0.06)",

      borderColor:
        "rgba(74, 222, 128, 0.2)",

      borderRadius:
        12,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        10,

      padding:
        12,
    },

    previewTitle: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        12,

      fontWeight:
        "800",
    },

    previewMeta: {
      color:
        universeTheme.colors
          .green,

      fontSize:
        9,

      marginTop:
        2,
    },

    imagePreview: {
      backgroundColor:
        "#020A12",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        16,

      borderWidth:
        1,

      height:
        310,

      overflow:
        "hidden",
    },

    previewImage: {
      height:
        "100%",

      width:
        "100%",
    },

    imageActions: {
      flexDirection:
        "row",

      gap:
        9,
    },

    secondaryButton: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.05)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        11,

      borderWidth:
        1,

      flex:
        1,

      flexDirection:
        "row",

      gap:
        7,

      justifyContent:
        "center",

      minHeight:
        45,

      paddingHorizontal:
        10,
    },

    secondaryButtonFull: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.05)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        11,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        7,

      justifyContent:
        "center",

      minHeight:
        45,
    },

    secondaryButtonText: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        11,

      fontWeight:
        "800",
    },

    pdfPreview: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(8, 24, 39, 0.88)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        15,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        12,

      minHeight:
        92,

      padding:
        14,
    },

    pdfIcon: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.08)",

      borderRadius:
        12,

      height:
        54,

      justifyContent:
        "center",

      width:
        54,
    },

    fileName: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        13,

      fontWeight:
        "800",
    },

    fileMeta: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        10,

      marginTop:
        4,
    },

    analysisCard: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.07)",

      borderColor:
        "rgba(115, 216, 255, 0.18)",

      borderRadius:
        12,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        11,

      padding:
        12,
    },

    analysisTitle: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        12,

      fontWeight:
        "800",
    },

    analysisText: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        10,

      lineHeight:
        15,

      marginTop:
        2,
    },

    errorBox: {
      alignItems:
        "flex-start",

      backgroundColor:
        "rgba(248, 113, 113, 0.06)",

      borderColor:
        "rgba(248, 113, 113, 0.22)",

      borderRadius:
        12,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        8,

      padding:
        11,
    },

    errorText: {
      color:
        universeTheme.colors
          .danger,

      flex:
        1,

      fontSize:
        11,

      lineHeight:
        16,
    },

    primaryButton: {
      alignItems:
        "center",

      backgroundColor:
        universeTheme.colors
          .primaryBright,

      borderRadius:
        12,

      flexDirection:
        "row",

      gap:
        8,

      justifyContent:
        "center",

      minHeight:
        52,

      paddingHorizontal:
        16,
    },

    primaryButtonText: {
      color:
        "#03131D",

      fontSize:
        13,

      fontWeight:
        "900",
    },

    buttonDisabled: {
      opacity:
        0.42,
    },

    flex: {
      flex:
        1,
    },
      galaxySelectionCard: {
      backgroundColor:
        "rgba(7, 17, 31, 0.76)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 16,
      borderWidth: 1,
      gap: 8,
      padding: 12,
    },

    galaxySelectionHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },

    galaxySelectionEyebrow: {
      color:
        universeTheme.colors
          .primary,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },

    galaxySelectionTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 14,
      fontWeight: "900",
      marginTop: 2,
    },

    galaxySelectionText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 10,
      lineHeight: 14,
      marginTop: 3,
    },

    galaxyCheckButton: {
      alignItems: "center",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },

    galaxyCheckButtonText: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 10,
      fontWeight: "800",
    },

    galaxyOption: {
      alignItems: "center",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: "row",
      gap: 9,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },

    galaxyOptionActive: {
      backgroundColor:
        "rgba(56, 189, 248, 0.08)",
      borderColor:
        universeTheme.colors
          .primary,
    },

    galaxyOptionTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 12,
      fontWeight: "800",
    },

    galaxyOptionMeta: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 9,
      marginTop: 1,
    },

});
