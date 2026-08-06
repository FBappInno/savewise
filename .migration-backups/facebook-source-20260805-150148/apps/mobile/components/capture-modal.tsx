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
  Switch,
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
  existingMainTopics: string[];
  onClose: () => void;
  onSave: (
    capturedItem: CapturedItem,
  ) => void;
};

export function CaptureModal({
  visible,
  existingMainTopics,
  onClose,
  onSave,
}: CaptureModalProps) {
  const { locale } =
    useAppSettings();

  const labels =
    captureLabels[locale];

  const [url, setUrl] =
    useState("");

  const [
    automaticClassification,
    setAutomaticClassification,
  ] = useState(true);

  const [
    isTopicPickerOpen,
    setTopicPickerOpen,
  ] = useState(false);

  const [
    selectedMainTopic,
    setSelectedMainTopic,
  ] = useState<string | null>(
    null,
  );

  const [
    customMainTopic,
    setCustomMainTopic,
  ] = useState("");

  const [
    topicSearch,
    setTopicSearch,
  ] = useState("");

  useEffect(() => {
    if (!visible) {
      resetForm();
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

  const normalizedMainTopics =
    useMemo(
      () =>
        normalizeMainTopics(
          existingMainTopics,
        ),
      [existingMainTopics],
    );

  const filteredMainTopics =
    useMemo(() => {
      const query =
        topicSearch
          .trim()
          .toLocaleLowerCase();

      if (!query) {
        return normalizedMainTopics;
      }

      return normalizedMainTopics.filter(
        (topic) =>
          topic
            .toLocaleLowerCase()
            .includes(query),
      );
    }, [
      normalizedMainTopics,
      topicSearch,
    ]);

  const resolvedManualTopic =
    resolveManualMainTopic(
      selectedMainTopic,
      customMainTopic,
    );

  const canSave =
    isValidUrl &&
    Boolean(metadata) &&
    (automaticClassification ||
      Boolean(resolvedManualTopic));

  function resetForm() {
    setUrl("");
    setAutomaticClassification(
      true,
    );
    setTopicPickerOpen(false);
    setSelectedMainTopic(null);
    setCustomMainTopic("");
    setTopicSearch("");
  }

  function handleAutomaticChange(
    value: boolean,
  ) {
    setAutomaticClassification(
      value,
    );

    if (value) {
      setTopicPickerOpen(false);
      setSelectedMainTopic(null);
      setCustomMainTopic("");
      setTopicSearch("");
    }
  }

  function handleSave() {
    if (
      !canSave ||
      !metadata
    ) {
      return;
    }

    const preferredKnowledgePath =
      automaticClassification
        ? undefined
        : resolvedManualTopic
          ? [resolvedManualTopic]
          : undefined;

    const capturedItem:
      CapturedItem = {
      id: Date.now().toString(),
      title: metadata.title,
      url: normalizedUrl,
      source: metadata.source,
      capturedAt:
        new Date().toISOString(),
      preferredKnowledgePath,
    };

    onSave(capturedItem);
    resetForm();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function selectMainTopic(
    topic: string,
  ) {
    setSelectedMainTopic(topic);
    setCustomMainTopic("");
    setTopicSearch("");
    setTopicPickerOpen(false);
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
            accessibilityLabel={
              labels.cancel
            }
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

          <View
            style={
              styles.headerCenter
            }
          >
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
            style={
              styles.headerSpacer
            }
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
          <View
            style={styles.introCard}
          >
            <View
              style={styles.introIcon}
            >
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
                {labels.captureTitle}
              </Text>

              <Text
                style={
                  styles.introText
                }
              >
                {labels.captureText}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>
            {labels.link}
          </Text>

          <View
            style={
              styles.inputWrapper
            }
          >
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

          <View
            style={
              styles.sectionHeader
            }
          >
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              KNOWLEDGE UNIVERSE
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              {labels.universe}
            </Text>

            <Text
              style={
                styles.sectionHint
              }
            >
              {labels.universeHint}
            </Text>
          </View>

          <View
            style={
              styles.automaticCard
            }
          >
            <View
              style={
                styles.automaticIcon
              }
            >
              <Ionicons
                color={
                  automaticClassification
                    ? universeTheme
                        .colors
                        .primaryBright
                    : universeTheme
                        .colors
                        .textMuted
                }
                name="sparkles-outline"
                size={20}
              />
            </View>

            <View style={styles.flex}>
              <Text
                style={
                  styles.automaticTitle
                }
              >
                {labels.automatic}
              </Text>

              <Text
                style={
                  styles.automaticText
                }
              >
                {
                  labels.automaticDescription
                }
              </Text>
            </View>

            <Switch
              ios_backgroundColor="rgba(148, 163, 184, 0.18)"
              onValueChange={
                handleAutomaticChange
              }
              thumbColor="#F8FAFC"
              trackColor={{
                false:
                  "rgba(148, 163, 184, 0.18)",
                true:
                  universeTheme.colors
                    .primary,
              }}
              value={
                automaticClassification
              }
            />
          </View>

          {!automaticClassification ? (
            <View
              style={
                styles.manualArea
              }
            >
              <Text
                style={
                  styles.manualEyebrow
                }
              >
                {labels.manual}
              </Text>

              <Text
                style={
                  styles.manualTitle
                }
              >
                {labels.mainTopic}
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setTopicPickerOpen(
                    (open) => !open,
                  );
                }}
                style={({ pressed }) => [
                  styles.topicSelect,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <View
                  style={
                    styles.topicSelectLeft
                  }
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors.primary
                    }
                    name="planet-outline"
                    size={18}
                  />

                  <Text
                    numberOfLines={1}
                    style={
                      selectedMainTopic
                        ? styles.topicSelectValue
                        : styles.topicSelectPlaceholder
                    }
                  >
                    {selectedMainTopic ??
                      labels.chooseMainTopic}
                  </Text>
                </View>

                <Ionicons
                  color={
                    universeTheme.colors
                      .textSecondary
                  }
                  name={
                    isTopicPickerOpen
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={18}
                />
              </Pressable>

              {isTopicPickerOpen ? (
                <View
                  style={
                    styles.topicPicker
                  }
                >
                  <View
                    style={
                      styles.topicSearchWrapper
                    }
                  >
                    <Ionicons
                      color={
                        universeTheme
                          .colors
                          .primary
                      }
                      name="search-outline"
                      size={17}
                    />

                    <TextInput
                      autoCapitalize="sentences"
                      autoCorrect={false}
                      onChangeText={
                        setTopicSearch
                      }
                      placeholder={
                        labels.searchTopics
                      }
                      placeholderTextColor={
                        universeTheme
                          .colors
                          .textMuted
                      }
                      selectionColor={
                        universeTheme
                          .colors
                          .primaryBright
                      }
                      style={
                        styles.topicSearchInput
                      }
                      value={topicSearch}
                    />
                  </View>

                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    style={
                      styles.topicOptions
                    }
                  >
                    {filteredMainTopics.length >
                    0 ? (
                      filteredMainTopics.map(
                        (topic) => (
                          <TopicOption
                            key={topic}
                            label={topic}
                            onPress={() => {
                              selectMainTopic(
                                topic,
                              );
                            }}
                            selected={
                              selectedMainTopic ===
                              topic
                            }
                          />
                        ),
                      )
                    ) : (
                      <Text
                        style={
                          styles.noTopicText
                        }
                      >
                        {
                          labels.noMatchingTopics
                        }
                      </Text>
                    )}
                  </ScrollView>
                </View>
              ) : null}

              <View
                style={
                  styles.orDivider
                }
              >
                <View
                  style={
                    styles.orLine
                  }
                />

                <Text
                  style={
                    styles.orText
                  }
                >
                  {labels.or}
                </Text>

                <View
                  style={
                    styles.orLine
                  }
                />
              </View>

              <Text
                style={
                  styles.customTopicLabel
                }
              >
                {labels.newMainTopic}
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  styles.customTopicWrapper,
                ]}
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .violet
                  }
                  name="add-circle-outline"
                  size={19}
                />

                <TextInput
                  autoCapitalize="sentences"
                  autoCorrect
                  maxLength={60}
                  onChangeText={(value) => {
                    setCustomMainTopic(
                      value,
                    );

                    if (value.trim()) {
                      setSelectedMainTopic(
                        null,
                      );
                      setTopicPickerOpen(
                        false,
                      );
                    }
                  }}
                  placeholder={
                    labels.newMainTopicPlaceholder
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
                  value={customMainTopic}
                />
              </View>

              <View
                style={
                  styles.aiHierarchyHint
                }
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .green
                  }
                  name="git-network-outline"
                  size={17}
                />

                <Text
                  style={
                    styles.aiHierarchyText
                  }
                >
                  {
                    labels.aiHierarchyHint
                  }
                </Text>
              </View>

              {!resolvedManualTopic ? (
                <View
                  style={
                    styles.validationRow
                  }
                >
                  <Ionicons
                    color={
                      universeTheme.colors
                        .orange
                    }
                    name="information-circle-outline"
                    size={16}
                  />

                  <Text
                    style={
                      styles.manualValidationText
                    }
                  >
                    {
                      labels.mainTopicRequired
                    }
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View
            style={
              styles.buttonContainer
            }
          >
            <SaveWiseButton
              disabled={!canSave}
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

function TopicOption({
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
        styles.topicOption,
        selected &&
          styles.topicOptionSelected,
        pressed &&
          styles.pressed,
      ]}
    >
      <View
        style={
          styles.topicOptionIcon
        }
      >
        <Ionicons
          color={
            selected
              ? universeTheme.colors
                  .primaryBright
              : universeTheme.colors
                  .textMuted
          }
          name="planet-outline"
          size={16}
        />
      </View>

      <Text
        style={[
          styles.topicOptionText,
          selected &&
            styles.topicOptionTextSelected,
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

function resolveManualMainTopic(
  selectedMainTopic: string | null,
  customMainTopic: string,
): string | undefined {
  const custom =
    normalizeTopicName(
      customMainTopic,
    );

  if (custom) {
    return custom;
  }

  return selectedMainTopic
    ? normalizeTopicName(
        selectedMainTopic,
      )
    : undefined;
}

function normalizeMainTopics(
  topics: string[],
): string[] {
  const unique =
    new Map<string, string>();

  topics.forEach((topic) => {
    const normalized =
      normalizeTopicName(topic);

    if (!normalized) {
      return;
    }

    const key =
      normalized.toLocaleLowerCase();

    if (!unique.has(key)) {
      unique.set(
        key,
        normalized,
      );
    }
  });

  return [...unique.values()].sort(
    (first, second) =>
      first.localeCompare(
        second,
        undefined,
        {
          sensitivity: "base",
        },
      ),
  );
}

function normalizeTopicName(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

const captureLabels = {
  de: {
    cancel: "Abbrechen",
    newDiscovery:
      "Neue Discovery",
    captureTitle:
      "Neues Wissen erfassen",
    captureText:
      "SaveWise analysiert, ordnet und verbindet deinen Link.",
    link: "Link",
    invalidUrl:
      "Bitte gib eine gültige Webadresse ein.",
    detected:
      "SaveWise erkannt",
    save:
      "Analysieren und speichern",
    universe:
      "Wissensuniversum",
    universeHint:
      "Lass SaveWise das Hauptthema bestimmen oder ordne den Beitrag selbst einer Hauptebene zu.",
    automatic:
      "Automatisch durch KI",
    automaticDescription:
      "SaveWise bestimmt Hauptthema, Topic und Unterthemen selbstständig.",
    manual:
      "MANUELLE EINORDNUNG",
    mainTopic: "Hauptthema",
    chooseMainTopic:
      "Bestehendes Hauptthema auswählen",
    searchTopics:
      "Hauptthemen durchsuchen …",
    noMatchingTopics:
      "Keine passenden Hauptthemen gefunden.",
    or: "oder",
    newMainTopic:
      "Neues Hauptthema",
    newMainTopicPlaceholder:
      "z. B. Robotik, Finanzen oder Reisen",
    aiHierarchyHint:
      "Die KI erstellt innerhalb des gewählten Hauptthemas weiterhin das passende Topic und die Unterthemen.",
    mainTopicRequired:
      "Wähle ein Hauptthema oder erfasse ein neues.",
  },

  en: {
    cancel: "Cancel",
    newDiscovery:
      "New discovery",
    captureTitle:
      "Capture new knowledge",
    captureText:
      "SaveWise analyzes, organizes and connects your link.",
    link: "Link",
    invalidUrl:
      "Please enter a valid web address.",
    detected:
      "SaveWise detected",
    save:
      "Analyze and save",
    universe:
      "Knowledge universe",
    universeHint:
      "Let SaveWise determine the main topic or assign the contribution yourself.",
    automatic:
      "Automatic by AI",
    automaticDescription:
      "SaveWise determines the main topic, topic and subtopics.",
    manual:
      "MANUAL CLASSIFICATION",
    mainTopic: "Main topic",
    chooseMainTopic:
      "Select an existing main topic",
    searchTopics:
      "Search main topics …",
    noMatchingTopics:
      "No matching main topics found.",
    or: "or",
    newMainTopic:
      "New main topic",
    newMainTopicPlaceholder:
      "e.g. Robotics, Finance or Travel",
    aiHierarchyHint:
      "AI will still create the appropriate topic and subtopics inside the selected main topic.",
    mainTopicRequired:
      "Select a main topic or create a new one.",
  },

  fr: {
    cancel: "Annuler",
    newDiscovery:
      "Nouvelle découverte",
    captureTitle:
      "Capturer de nouvelles connaissances",
    captureText:
      "SaveWise analyse, organise et relie votre lien.",
    link: "Lien",
    invalidUrl:
      "Saisissez une adresse web valide.",
    detected:
      "SaveWise a détecté",
    save:
      "Analyser et enregistrer",
    universe:
      "Univers des connaissances",
    universeHint:
      "Laissez SaveWise choisir le thème principal ou attribuez-le vous-même.",
    automatic:
      "Automatique par IA",
    automaticDescription:
      "SaveWise détermine le thème principal, le sujet et les sous-thèmes.",
    manual:
      "CLASSEMENT MANUEL",
    mainTopic:
      "Thème principal",
    chooseMainTopic:
      "Sélectionner un thème principal",
    searchTopics:
      "Rechercher les thèmes …",
    noMatchingTopics:
      "Aucun thème correspondant.",
    or: "ou",
    newMainTopic:
      "Nouveau thème principal",
    newMainTopicPlaceholder:
      "p. ex. Robotique, Finance ou Voyages",
    aiHierarchyHint:
      "L’IA crée toujours le sujet et les sous-thèmes appropriés.",
    mainTopicRequired:
      "Sélectionnez ou créez un thème principal.",
  },

  it: {
    cancel: "Annulla",
    newDiscovery:
      "Nuova scoperta",
    captureTitle:
      "Acquisisci nuova conoscenza",
    captureText:
      "SaveWise analizza, organizza e collega il tuo link.",
    link: "Link",
    invalidUrl:
      "Inserisci un indirizzo web valido.",
    detected:
      "SaveWise ha rilevato",
    save:
      "Analizza e salva",
    universe:
      "Universo della conoscenza",
    universeHint:
      "Lascia scegliere a SaveWise il tema principale oppure assegnalo manualmente.",
    automatic:
      "Automatico con IA",
    automaticDescription:
      "SaveWise determina il tema principale, l’argomento e i sottoargomenti.",
    manual:
      "CLASSIFICAZIONE MANUALE",
    mainTopic:
      "Tema principale",
    chooseMainTopic:
      "Seleziona un tema principale",
    searchTopics:
      "Cerca temi principali …",
    noMatchingTopics:
      "Nessun tema corrispondente.",
    or: "oppure",
    newMainTopic:
      "Nuovo tema principale",
    newMainTopicPlaceholder:
      "es. Robotica, Finanza o Viaggi",
    aiHierarchyHint:
      "L’IA crea comunque l’argomento e i sottoargomenti appropriati.",
    mainTopicRequired:
      "Seleziona o crea un tema principale.",
  },

  es: {
    cancel: "Cancelar",
    newDiscovery:
      "Nuevo descubrimiento",
    captureTitle:
      "Capturar nuevo conocimiento",
    captureText:
      "SaveWise analiza, organiza y conecta tu enlace.",
    link: "Enlace",
    invalidUrl:
      "Introduce una dirección web válida.",
    detected:
      "SaveWise detectó",
    save:
      "Analizar y guardar",
    universe:
      "Universo de conocimiento",
    universeHint:
      "Deja que SaveWise determine el tema principal o asígnalo manualmente.",
    automatic:
      "Automático por IA",
    automaticDescription:
      "SaveWise determina el tema principal, el tema y los subtemas.",
    manual:
      "CLASIFICACIÓN MANUAL",
    mainTopic:
      "Tema principal",
    chooseMainTopic:
      "Seleccionar un tema principal",
    searchTopics:
      "Buscar temas principales …",
    noMatchingTopics:
      "No se encontraron temas.",
    or: "o",
    newMainTopic:
      "Nuevo tema principal",
    newMainTopicPlaceholder:
      "p. ej. Robótica, Finanzas o Viajes",
    aiHierarchyHint:
      "La IA seguirá creando el tema y los subtemas apropiados.",
    mainTopicRequired:
      "Selecciona o crea un tema principal.",
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

  manualValidationText: {
    color:
      universeTheme.colors.orange,
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

  automaticCard: {
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
    gap: 11,
    padding: 14,
  },

  automaticIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.09)",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  automaticTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 13,
    fontWeight: "900",
  },

  automaticText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  manualArea: {
    backgroundColor:
      "rgba(6, 20, 36, 0.8)",
    borderColor:
      "rgba(139, 92, 246, 0.25)",
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },

  manualEyebrow: {
    color:
      universeTheme.colors.violet,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  manualTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 3,
  },

  topicSelect: {
    alignItems: "center",
    backgroundColor:
      "rgba(3, 12, 24, 0.72)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent:
      "space-between",
    minHeight: 54,
    paddingHorizontal: 13,
  },

  topicSelectLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 9,
  },

  topicSelectValue: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },

  topicSelectPlaceholder: {
    color:
      universeTheme.colors
        .textMuted,
    flex: 1,
    fontSize: 13,
  },

  topicPicker: {
    backgroundColor:
      "rgba(3, 12, 24, 0.95)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    marginTop: 7,
    overflow: "hidden",
  },

  topicSearchWrapper: {
    alignItems: "center",
    borderBottomColor:
      universeTheme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },

  topicSearchInput: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 12,
    paddingVertical: 11,
  },

  topicOptions: {
    maxHeight: 220,
  },

  topicOption: {
    alignItems: "center",
    borderBottomColor:
      universeTheme.colors.border,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    minHeight: 49,
    paddingHorizontal: 12,
  },

  topicOptionSelected: {
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
  },

  topicOptionIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.06)",
    borderRadius: 8,
    height: 29,
    justifyContent: "center",
    width: 29,
  },

  topicOptionText: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 12,
  },

  topicOptionTextSelected: {
    color:
      universeTheme.colors
        .primaryBright,
    fontWeight: "800",
  },

  noTopicText: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 11,
    padding: 15,
    textAlign: "center",
  },

  orDivider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginVertical: 14,
  },

  orLine: {
    backgroundColor:
      universeTheme.colors.border,
    flex: 1,
    height: 1,
  },

  orText: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  customTopicLabel: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 7,
  },

  customTopicWrapper: {
    borderColor:
      "rgba(139, 92, 246, 0.32)",
  },

  aiHierarchyHint: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(74, 222, 128, 0.05)",
    borderColor:
      "rgba(74, 222, 128, 0.18)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 11,
    padding: 11,
  },

  aiHierarchyText: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },

  buttonContainer: {
    marginTop: 26,
  },

  pressed: {
    opacity: 0.68,
  },
});