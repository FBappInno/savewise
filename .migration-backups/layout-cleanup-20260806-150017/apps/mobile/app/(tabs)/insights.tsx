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

import type {
  KnowledgeAnswer,
  KnowledgeDocument,
  KnowledgeDocumentType,
  SecondBrainOverview,
} from "@savewise/shared";

import { PersonalIntelligencePanel } from "@/components/intelligence/personal-intelligence-panel";
import { StarBackground } from "@/components/universe-ui/star-background";
import { useSecondBrain } from "@/hooks/use-second-brain";
import { useAppSettings } from "@/providers/app-settings-provider";
import { trackAnonymousEvent } from "@/services/anonymous-analytics";
import { universeTheme } from "@/theme/universe-theme";

const DOCUMENT_TYPES: {
  type: KnowledgeDocumentType;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    type: "summary",
    icon: "reader-outline",
  },
  {
    type: "learning-plan",
    icon: "school-outline",
  },
  {
    type: "presentation",
    icon: "easel-outline",
  },
  {
    type: "blog-article",
    icon: "create-outline",
  },
  {
    type: "checklist",
    icon: "checkbox-outline",
  },
  {
    type: "project-overview",
    icon: "map-outline",
  },
];

const EXAMPLE_QUESTIONS = {
  de: [
    "Was weiß ich über Protein?",
    "Welche Quellen widersprechen sich?",
    "Fasse mein Wissen über Ernährung zusammen.",
  ],
  en: [
    "What do I know about protein?",
    "Which sources contradict each other?",
    "Summarize my knowledge about nutrition.",
  ],
  fr: [
    "Que sais-je sur les protéines ?",
    "Quelles sources se contredisent ?",
    "Résume mes connaissances sur la nutrition.",
  ],
  it: [
    "Cosa so sulle proteine?",
    "Quali fonti si contraddicono?",
    "Riassumi le mie conoscenze sulla nutrizione.",
  ],
  es: [
    "¿Qué sé sobre proteínas?",
    "¿Qué fuentes se contradicen?",
    "Resume mi conocimiento sobre nutrición.",
  ],
} as const;

export default function SecondBrainScreen() {
  const {
    locale,
    settings,
    t,
  } = useAppSettings();

  const [
    question,
    setQuestion,
  ] = useState("");

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

  const exampleQuestions =
    EXAMPLE_QUESTIONS[locale];

  async function submitQuestion() {
    const currentQuestion =
      question.trim();

    if (
      currentQuestion.length < 3
    ) {
      return;
    }

    setQuestion("");

    void trackAnonymousEvent(
      "AIChatQuestion",
      {
        operation: "ai-chat",
      },
    );

    await ask(currentQuestion);
  }

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      style={styles.screen}
    >
      <StarBackground density={95} />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.aiLogo}>
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="sparkles"
                size={26}
              />
            </View>

            <View style={styles.flex}>
              <Text style={styles.eyebrow}>
                SAVEWISE INTELLIGENCE
              </Text>

              <Text style={styles.title}>
                AI Command Center
              </Text>
            </View>

            <View style={styles.aiStatus}>
              <View
                style={styles.aiStatusDot}
              />

              <Text
                style={
                  styles.aiStatusText
                }
              >
                ACTIVE
              </Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            Analysiere dein Wissen,
            entdecke Zusammenhänge und
            entwickle neue Erkenntnisse.
          </Text>
        </View>

        {!settings.ai.knowledgeGraph ? (
          <ErrorCard
            message={t(
              "brain.disabled",
            )}
          />
        ) : null}

        <View style={styles.askCard}>
          <View style={styles.askHeader}>
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                ASK YOUR UNIVERSE
              </Text>

              <Text
                style={
                  styles.askTitle
                }
              >
                Frag SaveWise
              </Text>
            </View>

            <View
              style={styles.askIcon}
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="hardware-chip-outline"
                size={22}
              />
            </View>
          </View>

          <TextInput
            editable={
              !isAnswering &&
              settings.ai
                .knowledgeGraph
            }
            multiline
            onChangeText={setQuestion}
            onSubmitEditing={
              submitQuestion
            }
            placeholder={t(
              "brain.placeholder",
            )}
            placeholderTextColor={
              universeTheme.colors
                .textMuted
            }
            returnKeyType="send"
            selectionColor={
              universeTheme.colors
                .primaryBright
            }
            style={styles.input}
            textAlignVertical="top"
            value={question}
          />

          <Pressable
            accessibilityRole="button"
            disabled={
              isAnswering ||
              question.trim().length <
                3 ||
              !settings.ai
                .knowledgeGraph
            }
            onPress={() => {
              void submitQuestion();
            }}
            style={({ pressed }) => [
              styles.askButton,

              (isAnswering ||
                question.trim()
                  .length < 3 ||
                !settings.ai
                  .knowledgeGraph) &&
                styles.disabled,

              pressed &&
                styles.pressed,
            ]}
          >
            {isAnswering ? (
              <ActivityIndicator
                color="#03111E"
              />
            ) : (
              <>
                <Ionicons
                  color="#03111E"
                  name="sparkles"
                  size={18}
                />

                <Text
                  style={
                    styles.askButtonText
                  }
                >
                  {t(
                    "brain.synthesize",
                  )}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={
            styles.examplesContent
          }
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          style={styles.examples}
        >
          {exampleQuestions.map(
            (example) => (
              <Pressable
                key={example}
                onPress={() =>
                  setQuestion(example)
                }
                style={({
                  pressed,
                }) => [
                  styles.exampleChip,

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Ionicons
                  color={
                    universeTheme
                      .colors.violet
                  }
                  name="flash-outline"
                  size={14}
                />

                <Text
                  style={
                    styles.exampleText
                  }
                >
                  {example}
                </Text>
              </Pressable>
            ),
          )}
        </ScrollView>

        <PersonalIntelligencePanel />

        {conversation.length > 0 ? (
          <View style={styles.chatHeader}>
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                AI CONVERSATION
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                {t("brain.chat")}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={
                clearConversation
              }
              style={({ pressed }) => [
                styles.clearButton,

                pressed &&
                  styles.pressed,
              ]}
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .textSecondary
                }
                name="trash-outline"
                size={15}
              />

              <Text
                style={
                  styles.clearText
                }
              >
                {t(
                  "brain.clearChat",
                )}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {answerError ? (
          <ErrorCard
            message={answerError}
          />
        ) : null}

        {conversation.map(
          (turn) => (
            <View
              key={turn.generatedAt}
              style={styles.chatTurn}
            >
              <View
                style={
                  styles.questionBubble
                }
              >
                <View
                  style={
                    styles.messageLabelRow
                  }
                >
                  <View
                    style={
                      styles.userDot
                    }
                  />

                  <Text
                    style={
                      styles.userLabel
                    }
                  >
                    YOU
                  </Text>
                </View>

                <Text
                  style={
                    styles.questionText
                  }
                >
                  {turn.question}
                </Text>
              </View>

              <AnswerCard
                answer={turn}
              />
            </View>
          ),
        )}

        <DocumentGenerator
          document={document}
          error={documentError}
          isGenerating={
            isGeneratingDocument
          }
          onGenerate={
            createDocument
          }
        />

        <View style={styles.analysisHeader}>
          <View
            style={
              styles.analysisTitleContainer
            }
          >
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              KNOWLEDGE HEALTH
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              {t(
                "brain.development",
              )}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={
              isLoadingOverview
            }
            onPress={() => {
              void loadOverview();
            }}
            style={({ pressed }) => [
              styles.analyzeButton,

              pressed &&
                styles.pressed,
            ]}
          >
            {isLoadingOverview ? (
              <ActivityIndicator
                color={
                  universeTheme.colors
                    .primaryBright
                }
                size="small"
              />
            ) : (
              <>
                <Ionicons
                  color={
                    universeTheme.colors
                      .primaryBright
                  }
                  name="pulse-outline"
                  size={16}
                />

                <Text
                  style={
                    styles.analyzeButtonText
                  }
                >
                  {overview
                    ? t(
                        "brain.refresh",
                      )
                    : t(
                        "brain.analyze",
                      )}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {overviewError ? (
          <ErrorCard
            message={overviewError}
          />
        ) : null}

        {overview ? (
          <OverviewContent
            overview={overview}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AnswerCard({
  answer,
}: {
  answer: KnowledgeAnswer;
}) {
  const { t } =
    useAppSettings();

  return (
    <View style={styles.answerCard}>
      <View style={styles.answerGlow} />

      <View style={styles.cardHeader}>
        <View style={styles.answerIcon}>
          <Ionicons
            color={
              universeTheme.colors
                .primaryBright
            }
            name="sparkles"
            size={19}
          />
        </View>

        <View style={styles.flex}>
          <Text
            style={
              styles.cardEyebrow
            }
          >
            SAVEWISE AI
          </Text>

          <Text
            style={
              styles.answerConfidence
            }
          >
            {t(
              "brain.synthesizedAnswer",
            )}
            {" · "}
            {Math.round(
              answer.confidence *
                100,
            )}
            %
          </Text>
        </View>
      </View>

      <Text style={styles.answerText}>
        {answer.answer}
      </Text>

      {answer.insufficientKnowledge ? (
        <View style={styles.missingCard}>
          <Ionicons
            color={
              universeTheme.colors
                .orange
            }
            name="information-circle-outline"
            size={19}
          />

          <Text
            style={
              styles.missingText
            }
          >
            {
              answer.insufficientKnowledge
            }
          </Text>
        </View>
      ) : null}

      <SynthesisContent
        answer={answer}
      />

      {answer.contradictions.map(
        (contradiction) => (
          <View
            key={
              contradiction.title
            }
            style={
              styles.contradictionCard
            }
          >
            <View
              style={
                styles.contradictionHeader
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .orange
                }
                name="git-compare-outline"
                size={17}
              />

              <Text
                style={
                  styles.contradictionTitle
                }
              >
                {
                  contradiction.title
                }
              </Text>
            </View>

            <Text
              style={
                styles.secondaryText
              }
            >
              {
                contradiction.explanation
              }
            </Text>
          </View>
        ),
      )}

      {answer.citations.length >
      0 ? (
        <View
          style={
            styles.sourcesSection
          }
        >
          <Text
            style={
              styles.smallTitle
            }
          >
            {t("brain.sources")}
          </Text>

          {answer.citations.map(
            (citation) => (
              <Pressable
                accessibilityRole="button"
                key={
                  citation.discoveryId
                }
                onPress={() =>
                  router.push(
                    `/discovery/${citation.discoveryId}`,
                  )
                }
                style={({ pressed }) => [
                  styles.sourceRow,

                  pressed &&
                    styles.pressed,
                ]}
              >
                <View
                  style={
                    styles.sourceIcon
                  }
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors
                        .primaryBright
                    }
                    name="document-text-outline"
                    size={16}
                  />
                </View>

                <View style={styles.flex}>
                  <Text
                    style={
                      styles.sourceTitle
                    }
                  >
                    {citation.title}
                  </Text>

                  <Text
                    style={
                      styles.secondaryText
                    }
                  >
                    {
                      citation.contribution
                    }
                  </Text>
                </View>

                <Ionicons
                  color={
                    universeTheme.colors
                      .textMuted
                  }
                  name="chevron-forward"
                  size={17}
                />
              </Pressable>
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}

function SynthesisContent({
  answer,
}: {
  answer: KnowledgeAnswer;
}) {
  const { t } =
    useAppSettings();

  const sections = [
    {
      title: t(
        "brain.overallInsight",
      ),
      values: [
        answer.synthesis
          .overallInsight,
      ],
    },
    {
      title: t(
        "brain.sharedStatements",
      ),
      values:
        answer.synthesis
          .sharedStatements,
    },
    {
      title: t(
        "brain.differentStatements",
      ),
      values:
        answer.synthesis
          .differingStatements,
    },
    {
      title: t(
        "brain.openQuestions",
      ),
      values:
        answer.synthesis
          .openQuestions,
    },
    {
      title: t(
        "brain.practicalConclusions",
      ),
      values:
        answer.synthesis
          .practicalConclusions,
    },
  ].filter((section) =>
    section.values.some(Boolean),
  );

  return (
    <View
      style={
        styles.synthesisSection
      }
    >
      {sections.map(
        (section) => (
          <View
            key={section.title}
            style={
              styles.synthesisBlock
            }
          >
            <Text
              style={
                styles.smallTitle
              }
            >
              {section.title}
            </Text>

            {section.values.map(
              (value, index) => (
                <View
                  key={`${section.title}-${index}`}
                  style={
                    styles.bulletRow
                  }
                >
                  <View
                    style={
                      styles.bulletDot
                    }
                  />

                  <Text
                    style={
                      styles.secondaryText
                    }
                  >
                    {value}
                  </Text>
                </View>
              ),
            )}
          </View>
        ),
      )}
    </View>
  );
}

function DocumentGenerator({
  document,
  error,
  isGenerating,
  onGenerate,
}: {
  document:
    | KnowledgeDocument
    | null;
  error: string | null;
  isGenerating: boolean;
  onGenerate: (
    type: KnowledgeDocumentType,
    instruction: string,
  ) => Promise<void>;
}) {
  const { t } =
    useAppSettings();

  const [
    instruction,
    setInstruction,
  ] = useState("");

  return (
    <View
      style={
        styles.documentSection
      }
    >
      <Text
        style={
          styles.sectionEyebrow
        }
      >
        KNOWLEDGE CREATOR
      </Text>

      <Text
        style={
          styles.sectionTitle
        }
      >
        {t(
          "brain.createFromKnowledge",
        )}
      </Text>

      <Text
        style={
          styles.sectionDescription
        }
      >
        Verwandle dein gespeichertes
        Wissen in strukturierte
        Arbeitsdokumente.
      </Text>

      <View
        style={
          styles.documentInputWrapper
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
            "brain.documentInstruction",
          )}
          placeholderTextColor={
            universeTheme.colors
              .textMuted
          }
          selectionColor={
            universeTheme.colors
              .primaryBright
          }
          style={
            styles.documentInput
          }
          value={instruction}
        />
      </View>

      <View
        style={
          styles.documentGrid
        }
      >
        {DOCUMENT_TYPES.map(
          ({ type, icon }) => (
            <Pressable
              disabled={isGenerating}
              key={type}
              onPress={() => {
                void onGenerate(
                  type,
                  instruction.trim() ||
                    t(
                      `brain.documentPrompt.${type}`,
                    ),
                );
              }}
              style={({ pressed }) => [
                styles.documentButton,

                isGenerating &&
                  styles.disabled,

                pressed &&
                  styles.pressed,
              ]}
            >
              <View
                style={
                  styles.documentButtonIcon
                }
              >
                <Ionicons
                  color={
                    universeTheme
                      .colors
                      .primaryBright
                  }
                  name={icon}
                  size={20}
                />
              </View>

              <Text
                style={
                  styles.documentButtonText
                }
              >
                {t(
                  `brain.documentType.${type}`,
                )}
              </Text>
            </Pressable>
          ),
        )}
      </View>

      {isGenerating ? (
        <View
          style={
            styles.documentLoader
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
              styles.loadingLabel
            }
          >
            SaveWise erstellt dein
            Dokument …
          </Text>
        </View>
      ) : null}

      {error ? (
        <ErrorCard message={error} />
      ) : null}

      {document ? (
        <KnowledgeDocumentCard
          document={document}
        />
      ) : null}
    </View>
  );
}

function KnowledgeDocumentCard({
  document,
}: {
  document: KnowledgeDocument;
}) {
  const { t } =
    useAppSettings();

  return (
    <View
      style={
        styles.documentCard
      }
    >
      <View
        style={
          styles.documentCardHeader
        }
      >
        <View
          style={
            styles.documentResultIcon
          }
        >
          <Ionicons
            color={
              universeTheme.colors
                .green
            }
            name="document-text-outline"
            size={22}
          />
        </View>

        <Text
          style={
            styles.documentCardTitle
          }
        >
          {document.title}
        </Text>
      </View>

      <Text style={styles.bodyText}>
        {document.introduction}
      </Text>

      {document.sections.map(
        (section) => (
          <View
            key={section.title}
            style={
              styles.documentContentSection
            }
          >
            <Text
              style={
                styles.smallTitle
              }
            >
              {section.title}
            </Text>

            <Text
              style={
                styles.bodyText
              }
            >
              {section.content}
            </Text>

            {section.discoveryIds
              .length > 0 ? (
              <Text
                style={
                  styles.evidenceCount
                }
              >
                {
                  section.discoveryIds
                    .length
                }{" "}
                {t(
                  "brain.supportingSources",
                )}
              </Text>
            ) : null}
          </View>
        ),
      )}

      {document.limitations
        .length > 0 ? (
        <View
          style={
            styles.missingCard
          }
        >
          <Ionicons
            color={
              universeTheme.colors
                .orange
            }
            name="warning-outline"
            size={18}
          />

          <Text
            style={
              styles.missingText
            }
          >
            {document.limitations.join(
              "\n",
            )}
          </Text>
        </View>
      ) : null}

      {document.citations.length >
      0 ? (
        <View
          style={
            styles.sourcesSection
          }
        >
          <Text
            style={
              styles.smallTitle
            }
          >
            {t("brain.sources")}
          </Text>

          {document.citations.map(
            (citation) => (
              <Pressable
                key={
                  citation.discoveryId
                }
                onPress={() =>
                  router.push(
                    `/discovery/${citation.discoveryId}`,
                  )
                }
                style={({ pressed }) => [
                  styles.sourceRow,

                  pressed &&
                    styles.pressed,
                ]}
              >
                <View
                  style={
                    styles.sourceIcon
                  }
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors
                        .primaryBright
                    }
                    name="document-outline"
                    size={16}
                  />
                </View>

                <View style={styles.flex}>
                  <Text
                    style={
                      styles.sourceTitle
                    }
                  >
                    {citation.title}
                  </Text>

                  <Text
                    style={
                      styles.secondaryText
                    }
                  >
                    {
                      citation.contribution
                    }
                  </Text>
                </View>
              </Pressable>
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}

function OverviewContent({
  overview,
}: {
  overview: SecondBrainOverview;
}) {
  const { t } =
    useAppSettings();

  const qualityDimensions = [
    [
      t("brain.completeness"),
      overview.quality
        .completeness,
    ],
    [
      t("brain.recency"),
      overview.quality.recency,
    ],
    [
      t(
        "brain.sourceDiversity",
      ),
      overview.quality
        .sourceDiversity,
    ],
    [
      t(
        "brain.trustworthiness",
      ),
      overview.quality
        .trustworthiness,
    ],
    [
      t(
        "brain.contradictions",
      ),
      overview.quality
        .contradictions,
    ],
    [
      t("brain.redundancy"),
      overview.quality
        .redundancy,
    ],
  ] as const;

  return (
    <View
      style={
        styles.overviewContainer
      }
    >
      <View
        style={
          styles.overallScoreCard
        }
      >
        <View
          style={
            styles.overallScoreCircle
          }
        >
          <Text
            style={
              styles.overallScoreValue
            }
          >
            {Math.round(
              overview.quality
                .overallScore * 100,
            )}
            %
          </Text>

          <Text
            style={
              styles.overallScoreLabel
            }
          >
            HEALTH
          </Text>
        </View>

        <View style={styles.flex}>
          <Text
            style={
              styles.smallEyebrow
            }
          >
            CURRENT KNOWLEDGE
          </Text>

          <Text
            style={
              styles.overallScoreTitle
            }
          >
            {t(
              "brain.currentKnowledge",
            )}
          </Text>

          <Text
            style={
              styles.secondaryText
            }
          >
            {
              overview.knowledgeSummary
            }
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View
          style={
            styles.qualityHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionEyebrow
              }
            >
              SYSTEM ANALYSIS
            </Text>

            <Text
              style={
                styles.sectionTitle
              }
            >
              {t(
                "brain.knowledgeQuality",
              )}
            </Text>
          </View>

          <Text
            style={
              styles.qualityScore
            }
          >
            {Math.round(
              overview.quality
                .overallScore * 100,
            )}
            %
          </Text>
        </View>

        <View
          style={
            styles.qualityGrid
          }
        >
          {qualityDimensions.map(
            ([
              label,
              dimension,
            ]) => (
              <View
                key={label}
                style={
                  styles.qualityCard
                }
              >
                <View
                  style={
                    styles.qualityCardTop
                  }
                >
                  <Text
                    style={
                      styles.qualityValue
                    }
                  >
                    {Math.round(
                      dimension.score *
                        100,
                    )}
                    %
                  </Text>

                  <View
                    style={
                      styles.qualityPulse
                    }
                  />
                </View>

                <Text
                  style={
                    styles.qualityLabel
                  }
                >
                  {label}
                </Text>

                <View
                  style={
                    styles.progressTrack
                  }
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(
                          dimension.score *
                            100,
                        )}%`,
                      },
                    ]}
                  />
                </View>

                <Text
                  style={
                    styles.qualitySummary
                  }
                >
                  {
                    dimension.summary
                  }
                </Text>
              </View>
            ),
          )}
        </View>

        {overview.quality.findings.map(
          (finding) => (
            <View
              key={finding}
              style={
                styles.findingRow
              }
            >
              <View
                style={
                  styles.findingIcon
                }
              >
                <Ionicons
                  color={
                    universeTheme
                      .colors
                      .primaryBright
                  }
                  name="analytics-outline"
                  size={16}
                />
              </View>

              <Text
                style={
                  styles.secondaryText
                }
              >
                {finding}
              </Text>
            </View>
          ),
        )}
      </View>

      <View style={styles.section}>
        <Text
          style={
            styles.sectionEyebrow
          }
        >
          MISSING KNOWLEDGE
        </Text>

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t(
            "brain.knowledgeGaps",
          )}
        </Text>

        {overview.gaps.map(
          (gap) => (
            <View
              key={gap.id}
              style={styles.gapCard}
            >
              <View
                style={
                  styles.gapHeader
                }
              >
                <View
                  style={
                    styles.gapIcon
                  }
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors.orange
                    }
                    name="compass-outline"
                    size={20}
                  />
                </View>

                <Text
                  style={
                    styles.gapTitle
                  }
                >
                  {gap.title}
                </Text>

                <View
                  style={
                    styles.priorityBadge
                  }
                >
                  <Text
                    style={
                      styles.priority
                    }
                  >
                    {Math.round(
                      gap.priority *
                        100,
                    )}
                    %
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.secondaryText
                }
              >
                {gap.description}
              </Text>

              <View
                style={styles.chips}
              >
                {gap.suggestedTopics.map(
                  (topic) => (
                    <View
                      key={topic}
                      style={
                        styles.topicChip
                      }
                    >
                      <View
                        style={
                          styles.topicDot
                        }
                      />

                      <Text
                        style={
                          styles.topicText
                        }
                      >
                        {topic}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          ),
        )}
      </View>

      <View style={styles.section}>
        <Text
          style={
            styles.sectionEyebrow
          }
        >
          KNOWLEDGE TIMELINE
        </Text>

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t(
            "brain.knowledgeEvolution",
          )}
        </Text>

        <View
          style={
            styles.timelineCard
          }
        >
          <Text
            style={styles.bodyText}
          >
            {
              overview.evolution
                .summary
            }
          </Text>

          {overview.evolution.developments.map(
            (development) => (
              <View
                key={`${development.from}-${development.to}-${development.title}`}
                style={
                  styles.development
                }
              >
                <View
                  style={
                    styles.timelineRail
                  }
                >
                  <View
                    style={
                      styles.timelineDot
                    }
                  />

                  <View
                    style={
                      styles.timelineLine
                    }
                  />
                </View>

                <View style={styles.flex}>
                  <Text
                    style={
                      styles.timeline
                    }
                  >
                    {development.from}
                    {" → "}
                    {development.to}
                  </Text>

                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    {
                      development.title
                    }
                  </Text>

                  <Text
                    style={
                      styles.secondaryText
                    }
                  >
                    {
                      development.description
                    }
                  </Text>
                </View>
              </View>
            ),
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text
          style={
            styles.sectionEyebrow
          }
        >
          PERSONAL MODEL
        </Text>

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t(
            "brain.personalProfile",
          )}
        </Text>

        <View
          style={
            styles.profileCard
          }
        >
          <View
            style={
              styles.profileHeader
            }
          >
            <View
              style={
                styles.profileIcon
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .violet
                }
                name="person-outline"
                size={22}
              />
            </View>

            <Text
              style={styles.bodyText}
            >
              {
                overview.profile
                  .developmentSummary
              }
            </Text>
          </View>

          <ProfileItems
            title={t(
              "brain.interests",
            )}
            values={
              overview.profile
                .interests
            }
          />

          <ProfileItems
            title={t(
              "brain.projects",
            )}
            values={
              overview.profile.projects
            }
          />

          <ProfileItems
            title={t(
              "brain.learningGoals",
            )}
            values={
              overview.profile
                .learningGoals
            }
          />

          <ProfileItems
            title={t(
              "brain.frequentQuestions",
            )}
            values={
              overview.profile
                .frequentQuestions
            }
          />
        </View>
      </View>
    </View>
  );
}

function ProfileItems({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  if (values.length === 0) {
    return null;
  }

  return (
    <View
      style={
        styles.profileSection
      }
    >
      <Text
        style={styles.smallTitle}
      >
        {title}
      </Text>

      <View style={styles.chips}>
        {values.map((value) => (
          <View
            key={value}
            style={
              styles.topicChip
            }
          >
            <View
              style={
                styles.topicDot
              }
            />

            <Text
              style={
                styles.topicText
              }
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ErrorCard({
  message,
}: {
  message: string;
}) {
  return (
    <View style={styles.errorCard}>
      <View
        style={styles.errorIcon}
      >
        <Ionicons
          color={
            universeTheme.colors
              .danger
          }
          name="alert-circle-outline"
          size={20}
        />
      </View>

      <Text
        style={styles.errorText}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor:
      universeTheme.colors
        .background,
    flex: 1,
  },

  content: {
    paddingBottom: 130,
    paddingHorizontal: 18,
    paddingTop: 58,
  },

  flex: {
    flex: 1,
  },

  header: {
    marginBottom: 24,
  },

  headerTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },

  aiLogo: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.1)",
    borderColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 17,
    borderWidth: 1.5,
    height: 52,
    justifyContent: "center",
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    width: 52,
  },

  eyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  title: {
    color:
      universeTheme.colors.text,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 33,
  },

  subtitle: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 13,
    maxWidth: 355,
  },

  aiStatus: {
    alignItems: "center",
    backgroundColor:
      "rgba(74, 222, 128, 0.06)",
    borderColor:
      "rgba(74, 222, 128, 0.22)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  aiStatusDot: {
    backgroundColor:
      universeTheme.colors.green,
    borderRadius: 999,
    height: 6,
    width: 6,
  },

  aiStatusText: {
    color:
      universeTheme.colors.green,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  askCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    padding: 17,
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.18,
    shadowRadius: 17,
  },

  askHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
  },

  sectionEyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
  },

  askTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 3,
  },

  askIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.09)",
    borderRadius: 13,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  input: {
    backgroundColor:
      "rgba(3, 12, 24, 0.72)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    color:
      universeTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 15,
    minHeight: 105,
    padding: 14,
  },

  askButton: {
    alignItems: "center",
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderRadius:
      universeTheme.radius.md,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 50,
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.44,
    shadowRadius: 14,
  },

  askButtonText: {
    color: "#03111E",
    fontSize: 14,
    fontWeight: "900",
  },

  disabled: {
    opacity: 0.42,
  },

  pressed: {
    opacity: 0.7,
  },

  examples: {
    marginHorizontal: -18,
    marginTop: 12,
  },

  examplesContent: {
    gap: 8,
    paddingHorizontal: 18,
  },

  exampleChip: {
    alignItems: "center",
    backgroundColor:
      "rgba(139, 92, 246, 0.07)",
    borderColor:
      "rgba(139, 92, 246, 0.27)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    maxWidth: 280,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  exampleText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },

  chatHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginTop: 38,
  },

  sectionTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 3,
  },

  clearButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(148, 163, 184, 0.06)",
    borderColor:
      universeTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },

  clearText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },

  chatTurn: {
    marginTop: 18,
  },

  questionBubble: {
    alignSelf: "flex-end",
    backgroundColor:
      "rgba(56, 189, 248, 0.13)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderBottomRightRadius: 4,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    maxWidth: "88%",
    padding: 14,
  },

  messageLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 7,
  },

  userDot: {
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 999,
    height: 6,
    width: 6,
  },

  userLabel: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  questionText: {
    color:
      universeTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },

  answerCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.96)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius:
      universeTheme.radius.lg,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    marginTop: 10,
    overflow: "hidden",
    padding: 17,
  },

  answerGlow: {
    backgroundColor:
      universeTheme.colors.primary,
    height: 2,
    left: 0,
    opacity: 0.82,
    position: "absolute",
    right: 0,
    top: 0,
  },

  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },

  answerIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.1)",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },

  cardEyebrow: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  answerConfidence: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 10,
    marginTop: 3,
  },

  answerText: {
    color:
      universeTheme.colors.text,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 15,
  },

  missingCard: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(251, 146, 60, 0.06)",
    borderColor:
      "rgba(251, 146, 60, 0.22)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
    padding: 13,
  },

  missingText: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },

  synthesisSection: {
    borderTopColor:
      universeTheme.colors.border,
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 6,
  },

  synthesisBlock: {
    marginTop: 14,
  },

  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 9,
    marginTop: 7,
  },

  bulletDot: {
    backgroundColor:
      universeTheme.colors.violet,
    borderRadius: 999,
    height: 6,
    marginTop: 6,
    width: 6,
  },

  contradictionCard: {
    backgroundColor:
      "rgba(251, 146, 60, 0.05)",
    borderColor:
      "rgba(251, 146, 60, 0.18)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    marginTop: 13,
    padding: 13,
  },

  contradictionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },

  contradictionTitle: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },

  sourcesSection: {
    borderTopColor:
      universeTheme.colors.border,
    borderTopWidth: 1,
    marginTop: 18,
    paddingTop: 16,
  },

  smallTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },

  sourceRow: {
    alignItems: "center",
    borderBottomColor:
      universeTheme.colors.border,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    paddingVertical: 9,
  },

  sourceIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },

  sourceTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },

  secondaryText: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  documentSection: {
    marginTop: 42,
  },

  sectionDescription: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  documentInputWrapper: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",
    borderColor:
      "rgba(139, 92, 246, 0.28)",
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
    paddingHorizontal: 14,
    paddingTop: 14,
  },

  documentInput: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 72,
    paddingBottom: 14,
    paddingTop: 0,
  },

  documentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 12,
  },

  documentButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.9)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 94,
    padding: 12,
    width: "48.6%",
  },

  documentButtonIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },

  documentButtonText: {
    color:
      universeTheme.colors.text,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    textAlign: "center",
  },

  documentLoader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 18,
  },

  loadingLabel: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 12,
  },

  documentCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.96)",
    borderColor:
      "rgba(74, 222, 128, 0.28)",
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    marginTop: 18,
    padding: 17,
  },

  documentCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },

  documentResultIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(74, 222, 128, 0.08)",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  documentCardTitle: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },

  bodyText: {
    color:
      universeTheme.colors.text,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 12,
  },

  documentContentSection: {
    borderTopColor:
      universeTheme.colors.border,
    borderTopWidth: 1,
    marginTop: 17,
    paddingTop: 17,
  },

  evidenceCount: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 9,
  },

  analysisHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginTop: 42,
  },

  analysisTitleContainer: {
    flex: 1,
  },

  analyzeButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.07)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minWidth: 98,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  analyzeButtonText: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },

  overviewContainer: {
    marginTop: 16,
  },

  overallScoreCard: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.96)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    padding: 17,
  },

  overallScoreCircle: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 999,
    borderWidth: 2,
    height: 88,
    justifyContent: "center",
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    width: 88,
  },

  overallScoreValue: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 22,
    fontWeight: "900",
  },

  overallScoreLabel: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },

  smallEyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  overallScoreTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },

  section: {
    marginTop: 30,
  },

  qualityHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginBottom: 13,
  },

  qualityScore: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 22,
    fontWeight: "900",
  },

  qualityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  qualityCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.91)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    padding: 13,
    width: "48.6%",
  },

  qualityCardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
  },

  qualityValue: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 19,
    fontWeight: "900",
  },

  qualityPulse: {
    backgroundColor:
      universeTheme.colors.green,
    borderRadius: 999,
    height: 7,
    shadowColor:
      universeTheme.colors.green,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    width: 7,
  },

  qualityLabel: {
    color:
      universeTheme.colors.text,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },

  progressTrack: {
    backgroundColor:
      "rgba(148, 163, 184, 0.12)",
    borderRadius: 999,
    height: 4,
    marginTop: 9,
    overflow: "hidden",
  },

  progressFill: {
    backgroundColor:
      universeTheme.colors.primary,
    borderRadius: 999,
    height: 4,
  },

  qualitySummary: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
  },

  findingRow: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(56, 189, 248, 0.05)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 9,
    padding: 12,
  },

  findingIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: 9,
    height: 30,
    justifyContent: "center",
    width: 30,
  },

  gapCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",
    borderColor:
      "rgba(251, 146, 60, 0.2)",
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    marginTop: 11,
    padding: 15,
  },

  gapHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },

  gapIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(251, 146, 60, 0.07)",
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    width: 38,
  },

  gapTitle: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },

  priorityBadge: {
    backgroundColor:
      "rgba(251, 146, 60, 0.07)",
    borderColor:
      "rgba(251, 146, 60, 0.24)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  priority: {
    color:
      universeTheme.colors.orange,
    fontSize: 10,
    fontWeight: "900",
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },

  topicChip: {
    alignItems: "center",
    backgroundColor:
      "rgba(139, 92, 246, 0.07)",
    borderColor:
      "rgba(139, 92, 246, 0.23)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  topicDot: {
    backgroundColor:
      universeTheme.colors.violet,
    borderRadius: 999,
    height: 5,
    width: 5,
  },

  topicText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },

  timelineCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    marginTop: 11,
    padding: 16,
  },

  development: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  timelineRail: {
    alignItems: "center",
    width: 14,
  },

  timelineDot: {
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 999,
    height: 9,
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 7,
    width: 9,
  },

  timelineLine: {
    backgroundColor:
      universeTheme.colors.border,
    flex: 1,
    marginTop: 5,
    width: 1,
  },

  timeline: {
    color:
      universeTheme.colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  cardTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 13,
    fontWeight: "900",
  },

  profileCard: {
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",
    borderColor:
      "rgba(139, 92, 246, 0.24)",
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    marginTop: 11,
    padding: 16,
  },

  profileHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },

  profileIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(139, 92, 246, 0.08)",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  profileSection: {
    borderTopColor:
      universeTheme.colors.border,
    borderTopWidth: 1,
    marginTop: 17,
    paddingTop: 15,
  },

  errorCard: {
    alignItems: "center",
    backgroundColor:
      "rgba(248, 113, 113, 0.07)",
    borderColor:
      "rgba(248, 113, 113, 0.25)",
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
    padding: 14,
  },

  errorIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(248, 113, 113, 0.08)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  errorText: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});