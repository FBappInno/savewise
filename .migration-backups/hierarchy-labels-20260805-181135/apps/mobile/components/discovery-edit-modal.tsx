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

import { StarBackground } from "@/components/universe-ui/star-background";
import { universeTheme } from "@/theme/universe-theme";

import type {
  Discovery,
  DiscoveryUpdate,
} from "@/types/discovery";

type DiscoveryEditModalLabels = {
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

type DiscoveryEditModalProps = {
  discovery: Discovery;
  existingMainTopics?: string[];
  labels: DiscoveryEditModalLabels;
  onClose: () => void;
  onSave: (
    update: DiscoveryUpdate,
  ) => Promise<void>;
  visible: boolean;
};

export function DiscoveryEditModal({
  discovery,
  existingMainTopics = [],
  labels,
  onClose,
  onSave,
  visible,
}: DiscoveryEditModalProps) {
  const [
    title,
    setTitle,
  ] = useState("");

  const [
    summary,
    setSummary,
  ] = useState("");

  const [
    automaticClassification,
    setAutomaticClassification,
  ] = useState(true);

  const [
    originalMainTopic,
    setOriginalMainTopic,
  ] = useState("");

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

  const [
    isTopicPickerOpen,
    setTopicPickerOpen,
  ] = useState(false);

  const [
    topic,
    setTopic,
  ] = useState("");

  const [
    subtopics,
    setSubtopics,
  ] = useState("");

  const [
    isSaving,
    setSaving,
  ] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const classification =
      discovery.classification;

    const currentMainTopic =
      normalizeTopicName(
        classification
          ?.secondaryCategory ??
          "General",
      );

    setTitle(
      discovery.improvedTitle ||
        discovery.title,
    );

    setSummary(
      discovery.summary ?? "",
    );

    setAutomaticClassification(
      true,
    );

    setOriginalMainTopic(
      currentMainTopic,
    );

    setSelectedMainTopic(
      currentMainTopic,
    );

    setCustomMainTopic("");
    setTopicSearch("");
    setTopicPickerOpen(false);

    setTopic(
      classification?.topic ??
        discovery.topics[0] ??
        "General",
    );

    setSubtopics(
      classification?.subtopics.join(
        ", ",
      ) ?? "",
    );
  }, [
    discovery,
    visible,
  ]);

  const normalizedMainTopics =
    useMemo(
      () =>
        normalizeMainTopics([
          ...existingMainTopics,
          originalMainTopic,
        ]),
      [
        existingMainTopics,
        originalMainTopic,
      ],
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
        (mainTopic) =>
          mainTopic
            .toLocaleLowerCase()
            .includes(query),
      );
    }, [
      normalizedMainTopics,
      topicSearch,
    ]);

  const resolvedMainTopic =
    automaticClassification
      ? originalMainTopic
      : resolveManualMainTopic(
          selectedMainTopic,
          customMainTopic,
        );

  const parsedSubtopics =
    useMemo(
      () =>
        normalizeSubtopics(
          subtopics,
        ),
      [subtopics],
    );

  const isValid =
    title.trim().length >= 3 &&
    summary.trim().length <= 420 &&
    resolvedMainTopic.length >= 2 &&
    topic.trim().length >= 2;

  function handleAutomaticChange(
    value: boolean,
  ) {
    setAutomaticClassification(
      value,
    );

    setTopicPickerOpen(false);
    setTopicSearch("");

    if (value) {
      setSelectedMainTopic(
        originalMainTopic,
      );

      setCustomMainTopic("");
    }
  }

  function selectMainTopic(
    mainTopic: string,
  ) {
    setSelectedMainTopic(
      mainTopic,
    );

    setCustomMainTopic("");
    setTopicSearch("");
    setTopicPickerOpen(false);
  }

  async function handleSave() {
    if (
      !isValid ||
      isSaving
    ) {
      return;
    }

    const existingClassification =
      discovery.classification;

    setSaving(true);

    try {
      await onSave({
        title: title.trim(),

        summary:
          summary.trim(),

        classification: {
          primaryCategory:
            existingClassification
              ?.primaryCategory ??
            "other",

          secondaryCategory:
            resolvedMainTopic,

          topic:
            topic.trim(),

          subtopics:
            parsedSubtopics,
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
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
        style={styles.screen}
      >
        <StarBackground density={48} />

        <View style={styles.header}>
          <Pressable
            accessibilityLabel={
              labels.cancel
            }
            accessibilityRole="button"
            disabled={isSaving}
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [
              styles.headerButton,
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
              DISCOVERY CONTROL
            </Text>

            <Text
              style={
                styles.headerTitle
              }
            >
              {labels.title}
            </Text>
          </View>

          <Pressable
            accessibilityLabel={
              labels.save
            }
            accessibilityRole="button"
            disabled={
              !isValid ||
              isSaving
            }
            hitSlop={10}
            onPress={() => {
              void handleSave();
            }}
            style={({ pressed }) => [
              styles.headerSaveButton,

              (!isValid ||
                isSaving) &&
                styles.disabled,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .primaryBright
              }
              name="checkmark"
              size={22}
            />
          </Pressable>
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
            <View
              style={styles.introIcon}
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="create-outline"
                size={22}
              />
            </View>

            <View style={styles.flex}>
              <Text
                style={
                  styles.introTitle
                }
              >
                Discovery bearbeiten
              </Text>

              <Text
                style={
                  styles.introText
                }
              >
                {labels.description}
              </Text>
            </View>
          </View>

          <SectionHeader
            eyebrow="CONTENT"
            title="Inhalt"
          />

          <Field
            icon="text-outline"
            label={
              labels.titleField
            }
            onChangeText={setTitle}
            value={title}
          />

          <Field
            icon="reader-outline"
            label={labels.summary}
            maxLength={420}
            multiline
            onChangeText={setSummary}
            style={
              styles.multilineInput
            }
            textAlignVertical="top"
            value={summary}
          />

          <Text style={styles.counter}>
            {summary.length}/420
          </Text>

          <SectionHeader
            eyebrow="KNOWLEDGE UNIVERSE"
            title="Einordnung"
          />

          <View
            style={
              styles.automaticCard
            }
          >
            <View
              style={[
                styles.automaticIcon,

                automaticClassification &&
                  styles.automaticIconActive,
              ]}
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
                Automatisch durch KI
              </Text>

              <Text
                style={
                  styles.automaticDescription
                }
              >
                Die aktuelle
                KI-Einordnung wird
                beibehalten.
              </Text>
            </View>

            <Switch
              ios_backgroundColor="rgba(148, 163, 184, 0.24)"
              onValueChange={
                handleAutomaticChange
              }
              thumbColor="#FFFFFF"
              trackColor={{
                false:
                  "rgba(148, 163, 184, 0.24)",

                true:
                  universeTheme.colors
                    .primary,
              }}
              value={
                automaticClassification
              }
            />
          </View>

          {automaticClassification ? (
            <View
              style={
                styles.currentPathCard
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .green
                }
                name="checkmark-circle-outline"
                size={20}
              />

              <View style={styles.flex}>
                <Text
                  style={
                    styles.currentPathLabel
                  }
                >
                  Aktuelles Hauptthema
                </Text>

                <Text
                  style={
                    styles.currentPathValue
                  }
                >
                  {originalMainTopic}
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={
                styles.manualPanel
              }
            >
              <Text
                style={
                  styles.manualEyebrow
                }
              >
                MANUELLE EINORDNUNG
              </Text>

              <Text
                style={
                  styles.manualTitle
                }
              >
                Hauptthema
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
                      "Hauptthema auswählen"}
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
                          .colors.primary
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
                      placeholder="Hauptthemen durchsuchen …"
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
                        (mainTopic) => (
                          <TopicOption
                            key={
                              mainTopic
                            }
                            label={
                              mainTopic
                            }
                            onPress={() => {
                              selectMainTopic(
                                mainTopic,
                              );
                            }}
                            selected={
                              selectedMainTopic ===
                              mainTopic
                            }
                          />
                        ),
                      )
                    ) : (
                      <Text
                        style={
                          styles.emptyTopics
                        }
                      >
                        Keine passenden
                        Hauptthemen
                        gefunden.
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
                  ODER
                </Text>

                <View
                  style={
                    styles.orLine
                  }
                />
              </View>

              <Field
                icon="add-circle-outline"
                label="Neues Hauptthema"
                maxLength={60}
                onChangeText={(
                  value,
                ) => {
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
                placeholder="z. B. Raumfahrt"
                value={customMainTopic}
              />

              <View
                style={
                  styles.manualHint
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
                    styles.manualHintText
                  }
                >
                  Ein neues Hauptthema
                  erscheint nach dem
                  Speichern automatisch
                  im Universum.
                </Text>
              </View>
            </View>
          )}

          <Field
            icon="git-branch-outline"
            label={labels.topic}
            onChangeText={setTopic}
            value={topic}
          />

          <Field
            icon="pricetags-outline"
            label={labels.subtopics}
            onChangeText={
              setSubtopics
            }
            placeholder={
              labels.subtopicsHint
            }
            value={subtopics}
          />

          <Text
            style={
              styles.subtopicHint
            }
          >
            Unterthemen mit Kommas
            trennen. Maximal sechs
            Einträge.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={
              !isValid ||
              isSaving
            }
            onPress={() => {
              void handleSave();
            }}
            style={({ pressed }) => [
              styles.primaryButton,

              (!isValid ||
                isSaving) &&
                styles.disabled,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color="#03253A"
              name={
                isSaving
                  ? "sync-outline"
                  : "checkmark-circle-outline"
              }
              size={20}
            />

            <Text
              style={
                styles.primaryButtonText
              }
            >
              {isSaving
                ? labels.saving
                : labels.save}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SectionHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
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
        {eyebrow}
      </Text>

      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>
    </View>
  );
}

function Field({
  icon,
  label,
  style,
  ...props
}: React.ComponentProps<
  typeof TextInput
> & {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text
        style={styles.fieldLabel}
      >
        {label}
      </Text>

      <View
        style={
          styles.inputContainer
        }
      >
        <Ionicons
          color={
            universeTheme.colors
              .primary
          }
          name={icon}
          size={18}
          style={
            props.multiline
              ? styles.multilineIcon
              : undefined
          }
        />

        <TextInput
          placeholderTextColor={
            universeTheme.colors
              .textMuted
          }
          selectionColor={
            universeTheme.colors
              .primaryBright
          }
          style={[
            styles.input,
            style,
          ]}
          {...props}
        />
      </View>
    </View>
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
  selectedMainTopic:
    | string
    | null,
  customMainTopic: string,
): string {
  const custom =
    normalizeTopicName(
      customMainTopic,
    );

  if (custom) {
    return custom;
  }

  return normalizeTopicName(
    selectedMainTopic ?? "",
  );
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

function normalizeSubtopics(
  value: string,
): string[] {
  const unique =
    new Map<string, string>();

  value
    .split(",")
    .map((entry) =>
      entry
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .forEach((entry) => {
      const key =
        entry.toLocaleLowerCase();

      if (!unique.has(key)) {
        unique.set(key, entry);
      }
    });

  return [...unique.values()].slice(
    0,
    6,
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#0B1E33",
    flex: 1,
  },

  header: {
    alignItems: "center",
    backgroundColor:
      "rgba(17, 43, 70, 0.97)",
    borderBottomColor:
      "rgba(125, 211, 252, 0.20)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent:
      "space-between",
    minHeight: 88,
    paddingHorizontal: 18,
    paddingTop: 18,
  },

  headerButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  headerSaveButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.16)",
    borderColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 999,
    borderWidth: 1,
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
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  headerTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },

  content: {
    padding: 18,
    paddingBottom: 50,
  },

  flex: {
    flex: 1,
  },

  introCard: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(29, 58, 88, 0.88)",
    borderColor:
      "rgba(125, 211, 252, 0.22)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },

  introIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.14)",
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  introTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },

  introText: {
    color: "#B8C7D9",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  sectionHeader: {
    marginBottom: 12,
    marginTop: 28,
  },

  sectionEyebrow: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 3,
  },

  field: {
    marginBottom: 14,
  },

  fieldLabel: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 7,
  },

  inputContainer: {
    alignItems: "center",
    backgroundColor:
      "rgba(38, 69, 101, 0.92)",
    borderColor:
      "rgba(148, 197, 229, 0.26)",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
  },

  input: {
    color: "#FFFFFF",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 52,
    paddingVertical: 14,
  },

  multilineInput: {
    minHeight: 112,
  },

  multilineIcon: {
    alignSelf: "flex-start",
    marginTop: 16,
  },

  counter: {
    color: "#93A8BD",
    fontSize: 10,
    marginTop: -8,
    textAlign: "right",
  },

  automaticCard: {
    alignItems: "center",
    backgroundColor:
      "rgba(33, 69, 103, 0.92)",
    borderColor:
      "rgba(125, 211, 252, 0.30)",
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 14,
  },

  automaticIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(148, 163, 184, 0.12)",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  automaticIconActive: {
    backgroundColor:
      "rgba(56, 189, 248, 0.16)",
  },

  automaticTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  automaticDescription: {
    color: "#B8C7D9",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  currentPathCard: {
    alignItems: "center",
    backgroundColor:
      "rgba(30, 77, 92, 0.65)",
    borderColor:
      "rgba(74, 222, 128, 0.28)",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    padding: 13,
  },

  currentPathLabel: {
    color: "#B8C7D9",
    fontSize: 10,
    fontWeight: "700",
  },

  currentPathValue: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },

  manualPanel: {
    backgroundColor:
      "rgba(33, 57, 89, 0.94)",
    borderColor:
      "rgba(167, 139, 250, 0.34)",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 11,
    padding: 14,
  },

  manualEyebrow: {
    color:
      universeTheme.colors.violet,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  manualTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 3,
  },

  topicSelect: {
    alignItems: "center",
    backgroundColor:
      "rgba(48, 81, 113, 0.92)",
    borderColor:
      "rgba(148, 197, 229, 0.30)",
    borderRadius: 15,
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
    color: "#FFFFFF",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },

  topicSelectPlaceholder: {
    color: "#94A9BE",
    flex: 1,
    fontSize: 13,
  },

  topicPicker: {
    backgroundColor:
      "rgba(27, 52, 80, 0.99)",
    borderColor:
      "rgba(148, 197, 229, 0.26)",
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 7,
    overflow: "hidden",
  },

  topicSearchWrapper: {
    alignItems: "center",
    borderBottomColor:
      "rgba(148, 197, 229, 0.20)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12,
  },

  topicSearchInput: {
    color: "#FFFFFF",
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
      "rgba(148, 197, 229, 0.16)",
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    minHeight: 49,
    paddingHorizontal: 12,
  },

  topicOptionSelected: {
    backgroundColor:
      "rgba(56, 189, 248, 0.12)",
  },

  topicOptionIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: 8,
    height: 29,
    justifyContent: "center",
    width: 29,
  },

  topicOptionText: {
    color: "#C6D4E1",
    flex: 1,
    fontSize: 12,
  },

  topicOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  emptyTopics: {
    color: "#94A9BE",
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
      "rgba(148, 197, 229, 0.20)",
    flex: 1,
    height: 1,
  },

  orText: {
    color: "#94A9BE",
    fontSize: 9,
    fontWeight: "900",
  },

  manualHint: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(40, 92, 91, 0.55)",
    borderColor:
      "rgba(74, 222, 128, 0.22)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 11,
  },

  manualHintText: {
    color: "#C7D7E5",
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },

  subtopicHint: {
    color: "#94A9BE",
    fontSize: 10,
    lineHeight: 15,
    marginTop: -7,
  },

  primaryButton: {
    alignItems: "center",
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 26,
    minHeight: 54,
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 13,
  },

  primaryButtonText: {
    color: "#03253A",
    fontSize: 14,
    fontWeight: "900",
  },

  disabled: {
    opacity: 0.42,
  },

  pressed: {
    opacity: 0.7,
  },
});