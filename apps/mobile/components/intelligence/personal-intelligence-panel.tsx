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

import type {
  WorkAssistantTaskType,
} from "@savewise/shared";

import { usePersonalIntelligence } from "@/hooks/use-personal-intelligence";
import { useAppSettings } from "@/providers/app-settings-provider";
import { universeTheme } from "@/theme/universe-theme";

const TASKS: {
  type: WorkAssistantTaskType;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    type: "meeting-brief",
    icon: "people-outline",
  },
  {
    type: "presentation",
    icon: "easel-outline",
  },
  {
    type: "project-summary",
    icon: "folder-open-outline",
  },
  {
    type: "learning-plan",
    icon: "school-outline",
  },
  {
    type: "talk-outline",
    icon: "mic-outline",
  },
  {
    type: "business-case",
    icon: "briefcase-outline",
  },
];

export function PersonalIntelligencePanel() {
  const { t } =
    useAppSettings();

  const {
    overview,
    workProduct,
    isLoading,
    isWorking,
    error,
    createWorkProduct,
  } = usePersonalIntelligence();

  const [
    instruction,
    setInstruction,
  ] = useState("");

  const [
    includeResearch,
    setIncludeResearch,
  ] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons
            color={
              universeTheme.colors
                .violet
            }
            name="analytics-outline"
            size={22}
          />
        </View>

        <View style={styles.flex}>
          <Text style={styles.eyebrow}>
            PERSONAL INTELLIGENCE
          </Text>

          <Text style={styles.title}>
            {t(
              "intelligence.title",
            )}
          </Text>
        </View>
      </View>

      <Text
        style={styles.description}
      >
        {t(
          "intelligence.description",
        )}
      </Text>

      {isLoading ? (
        <View style={styles.loaderRow}>
          <ActivityIndicator
            color={
              universeTheme.colors
                .primaryBright
            }
          />

          <Text
            style={
              styles.loaderText
            }
          >
            Persönliches Modell wird
            geladen …
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons
            color={
              universeTheme.colors
                .danger
            }
            name="alert-circle-outline"
            size={18}
          />

          <Text
            style={styles.error}
          >
            {error}
          </Text>
        </View>
      ) : null}

      {overview ? (
        <>
          <View style={styles.versionCard}>
            <View
              style={
                styles.versionIcon
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="git-network-outline"
                size={22}
              />
            </View>

            <View style={styles.flex}>
              <Text
                style={
                  styles.cardEyebrow
                }
              >
                PERSONAL MODEL
              </Text>

              <Text
                style={styles.cardTitle}
              >
                {t(
                  "intelligence.modelVersion",
                )}{" "}
                {
                  overview.modelVersion
                }
              </Text>

              <Text
                style={
                  styles.secondary
                }
              >
                {overview.latestLearningEvent
                  ?.explanation ??
                  t(
                    "intelligence.noLearningEvent",
                  )}
              </Text>
            </View>

            <View
              style={
                styles.modelStatus
              }
            >
              <View
                style={
                  styles.modelStatusDot
                }
              />

              <Text
                style={
                  styles.modelStatusText
                }
              >
                LEARNING
              </Text>
            </View>
          </View>

          {overview.predictions.length >
          0 ? (
            <View style={styles.section}>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                PREDICTIONS
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                {t(
                  "intelligence.predictions",
                )}
              </Text>

              {overview.predictions
                .slice(0, 4)
                .map((prediction) => (
                  <View
                    key={prediction.id}
                    style={
                      styles.predictionCard
                    }
                  >
                    <View
                      style={
                        styles.predictionHeader
                      }
                    >
                      <View
                        style={
                          styles.predictionIcon
                        }
                      >
                        <Ionicons
                          color={
                            universeTheme
                              .colors
                              .primaryBright
                          }
                          name="telescope-outline"
                          size={18}
                        />
                      </View>

                      <Text
                        style={
                          styles.itemTitle
                        }
                      >
                        {prediction.title}
                      </Text>

                      <View
                        style={
                          styles.confidenceBadge
                        }
                      >
                        <Text
                          style={
                            styles.confidence
                          }
                        >
                          {Math.round(
                            prediction.confidence *
                              100,
                          )}
                          %
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.secondary
                      }
                    >
                      {
                        prediction.explanation
                      }
                    </Text>

                    {prediction.discoveryIds
                      .length > 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          router.push(
                            `/discovery/${prediction.discoveryIds[0]}`,
                          )
                        }
                        style={({
                          pressed,
                        }) => [
                          styles.evidenceButton,

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <Ionicons
                          color={
                            universeTheme
                              .colors
                              .primaryBright
                          }
                          name="documents-outline"
                          size={14}
                        />

                        <Text
                          style={
                            styles.evidence
                          }
                        >
                          {
                            prediction
                              .discoveryIds
                              .length
                          }{" "}
                          {t(
                            "intelligence.evidence",
                          )}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
            </View>
          ) : null}

          {overview.recommendations
            .length > 0 ? (
            <View style={styles.section}>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                RECOMMENDATIONS
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                {t(
                  "intelligence.recommendations",
                )}
              </Text>

              {overview.recommendations
                .slice(0, 5)
                .map(
                  (
                    recommendation,
                  ) => (
                    <Pressable
                      accessibilityRole="button"
                      key={
                        recommendation.id
                      }
                      onPress={() => {
                        if (
                          recommendation.url
                        ) {
                          void Linking.openURL(
                            recommendation.url,
                          );

                          return;
                        }

                        if (
                          recommendation
                            .discoveryIds[0]
                        ) {
                          router.push(
                            `/discovery/${recommendation.discoveryIds[0]}`,
                          );
                        }
                      }}
                      style={({
                        pressed,
                      }) => [
                        styles.recommendationCard,

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <View
                        style={
                          styles.recommendationIcon
                        }
                      >
                        <Ionicons
                          color={
                            universeTheme
                              .colors.yellow
                          }
                          name="bulb-outline"
                          size={18}
                        />
                      </View>

                      <View
                        style={
                          styles.flex
                        }
                      >
                        <Text
                          style={
                            styles.itemTitle
                          }
                        >
                          {
                            recommendation.title
                          }
                        </Text>

                        <Text
                          style={
                            styles.secondary
                          }
                        >
                          {
                            recommendation.description
                          }
                        </Text>
                      </View>

                      <Ionicons
                        color={
                          universeTheme.colors
                            .textMuted
                        }
                        name="chevron-forward"
                        size={16}
                      />
                    </Pressable>
                  ),
                )}
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.section}>
        <Text
          style={
            styles.sectionEyebrow
          }
        >
          WORK ASSISTANT
        </Text>

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t(
            "intelligence.workAssistant",
          )}
        </Text>

        <Text
          style={
            styles.sectionDescription
          }
        >
          Erzeuge professionelle
          Arbeitsresultate aus deinem
          persönlichen Wissensmodell.
        </Text>

        <View
          style={
            styles.inputWrapper
          }
        >
          <Ionicons
            color={
              universeTheme.colors
                .violet
            }
            name="create-outline"
            size={19}
          />

          <TextInput
            multiline
            onChangeText={
              setInstruction
            }
            placeholder={t(
              "intelligence.workPlaceholder",
            )}
            placeholderTextColor={
              universeTheme.colors
                .textMuted
            }
            selectionColor={
              universeTheme.colors
                .primaryBright
            }
            style={styles.input}
            textAlignVertical="top"
            value={instruction}
          />
        </View>

        <View
          style={
            styles.researchRow
          }
        >
          <View style={styles.flex}>
            <Text
              style={
                styles.switchTitle
              }
            >
              {t(
                "intelligence.includeResearch",
              )}
            </Text>

            <Text
              style={
                styles.secondary
              }
            >
              {t(
                "intelligence.includeResearchHint",
              )}
            </Text>
          </View>

          <Switch
            ios_backgroundColor="rgba(148, 163, 184, 0.18)"
            onValueChange={
              setIncludeResearch
            }
            thumbColor="#F8FAFC"
            trackColor={{
              false:
                "rgba(148, 163, 184, 0.18)",
              true:
                universeTheme.colors
                  .primary,
            }}
            value={includeResearch}
          />
        </View>

        <View style={styles.taskGrid}>
          {TASKS.map(
            ({ type, icon }) => (
              <Pressable
                disabled={
                  isWorking ||
                  instruction.trim()
                    .length < 3
                }
                key={type}
                onPress={() => {
                  void createWorkProduct(
                    {
                      type,

                      instruction:
                        instruction.trim(),

                      includeVerifiedResearch:
                        includeResearch,
                    },
                  );
                }}
                style={({
                  pressed,
                }) => [
                  styles.taskButton,

                  instruction.trim()
                    .length < 3 &&
                    styles.disabled,

                  pressed &&
                    styles.pressed,
                ]}
              >
                <View
                  style={
                    styles.taskIcon
                  }
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors
                        .primaryBright
                    }
                    name={icon}
                    size={19}
                  />
                </View>

                <Text
                  style={
                    styles.taskText
                  }
                >
                  {t(
                    `intelligence.task.${type}`,
                  )}
                </Text>
              </Pressable>
            ),
          )}
        </View>

        {isWorking ? (
          <View
            style={
              styles.loaderRow
            }
          >
            <ActivityIndicator
              color={
                universeTheme.colors
                  .primaryBright
              }
            />

            <Text
              style={
                styles.loaderText
              }
            >
              SaveWise erstellt dein
              Arbeitsresultat …
            </Text>
          </View>
        ) : null}

        {workProduct ? (
          <View
            style={
              styles.resultCard
            }
          >
            <View
              style={
                styles.resultHeader
              }
            >
              <View
                style={
                  styles.resultIcon
                }
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .green
                  }
                  name="checkmark-circle-outline"
                  size={22}
                />
              </View>

              <Text
                style={
                  styles.resultTitle
                }
              >
                {workProduct.title}
              </Text>
            </View>

            <Text style={styles.body}>
              {
                workProduct.introduction
              }
            </Text>

            {workProduct.sections.map(
              (section) => (
                <View
                  key={section.title}
                  style={
                    styles.resultSection
                  }
                >
                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    {section.title}
                  </Text>

                  <Text
                    style={styles.body}
                  >
                    {section.content}
                  </Text>
                </View>
              ),
            )}

            <View
              style={
                styles.resultEvidence
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="library-outline"
                size={15}
              />

              <Text
                style={
                  styles.evidence
                }
              >
                {
                  workProduct
                    .libraryCitations
                    .length
                }{" "}
                {t(
                  "intelligence.librarySources",
                )}
                {" · "}
                {
                  workProduct
                    .researchCitations
                    .length
                }{" "}
                {t(
                  "intelligence.researchSources",
                )}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
  },

  flex: {
    flex: 1,
  },

  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },

  headerIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(139, 92, 246, 0.08)",
    borderColor:
      "rgba(139, 92, 246, 0.25)",
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },

  eyebrow: {
    color:
      universeTheme.colors.violet,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  title: {
    color:
      universeTheme.colors.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 2,
  },

  description: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
  },

  loaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 18,
  },

  loaderText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 12,
  },

  errorCard: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(248, 113, 113, 0.07)",
    borderColor:
      "rgba(248, 113, 113, 0.24)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
    padding: 12,
  },

  error: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },

  versionCard: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",
    borderColor:
      "rgba(139, 92, 246, 0.25)",
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    padding: 15,
  },

  versionIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: 13,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  cardEyebrow: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  cardTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },

  secondary: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  modelStatus: {
    alignItems: "center",
    backgroundColor:
      "rgba(74, 222, 128, 0.06)",
    borderColor:
      "rgba(74, 222, 128, 0.2)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  modelStatusDot: {
    backgroundColor:
      universeTheme.colors.green,
    borderRadius: 999,
    height: 5,
    width: 5,
  },

  modelStatusText: {
    color:
      universeTheme.colors.green,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  section: {
    marginTop: 30,
  },

  sectionEyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  sectionTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 3,
  },

  sectionDescription: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  predictionCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.92)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    marginTop: 10,
    padding: 13,
  },

  predictionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },

  predictionIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },

  itemTitle: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
  },

  confidenceBadge: {
    backgroundColor:
      "rgba(56, 189, 248, 0.07)",
    borderColor:
      universeTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  confidence: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 9,
    fontWeight: "900",
  },

  evidenceButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginTop: 9,
  },

  evidence: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 10,
    fontWeight: "700",
  },

  recommendationCard: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.92)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 9,
    padding: 13,
  },

  recommendationIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(250, 204, 21, 0.07)",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },

  pressed: {
    opacity: 0.7,
  },

  inputWrapper: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",
    borderColor:
      "rgba(139, 92, 246, 0.27)",
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingTop: 14,
  },

  input: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 82,
    paddingBottom: 14,
    paddingTop: 0,
  },

  researchRow: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.75)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginTop: 11,
    padding: 13,
  },

  switchTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },

  taskGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 12,
  },

  taskButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.92)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 62,
    padding: 11,
    width: "48.6%",
  },

  taskIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },

  taskText: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },

  disabled: {
    opacity: 0.42,
  },

  resultCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.96)",
    borderColor:
      "rgba(74, 222, 128, 0.26)",
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },

  resultHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },

  resultIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(74, 222, 128, 0.08)",
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  resultTitle: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },

  body: {
    color:
      universeTheme.colors.text,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 11,
  },

  resultSection: {
    borderTopColor:
      universeTheme.colors.border,
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 16,
  },

  resultEvidence: {
    alignItems: "center",
    borderTopColor:
      universeTheme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginTop: 16,
    paddingTop: 13,
  },
});