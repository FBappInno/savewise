import { Ionicons } from "@expo/vector-icons";
import {
  router,
  Stack,
  useLocalSearchParams,
} from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DiscoveryEditModal } from "@/components/discovery-edit-modal";
import { RelatedDiscoveries } from "@/components/related-discoveries";
import { StarBackground } from "@/components/universe-ui/star-background";
import { useAppSettings } from "@/providers/app-settings-provider";
import { hybridDiscoveryRepository } from "@/repositories/hybrid-discovery-repository";
import { universeTheme } from "@/theme/universe-theme";

import type {
  Discovery,
  DiscoveryUpdate,
} from "@/types/discovery";

export default function DiscoveryDetailScreen() {
  const {
    locale,
    settings,
    t,
  } = useAppSettings();

  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const discoveryId =
    typeof params.id === "string"
      ? params.id
      : params.id?.[0] ?? "";

  const [
    discovery,
    setDiscovery,
  ] = useState<Discovery | null>(
    null,
  );

  const [
    allDiscoveries,
    setAllDiscoveries,
  ] = useState<Discovery[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    isEditing,
    setEditing,
  ] = useState(false);

  const existingMainTopics =
    useMemo(
      () =>
        buildMainTopics(
          allDiscoveries,
        ),
      [allDiscoveries],
    );

  const loadDiscovery =
    useCallback(async () => {
      if (!discoveryId) {
        setError(
          "Keine Discovery-ID vorhanden.",
        );

        setIsLoading(false);

        return;
      }

      setError(null);
      setIsLoading(true);

      try {
        const [
          localDiscovery,
          localDiscoveries,
        ] = await Promise.all([
          hybridDiscoveryRepository.getById(
            discoveryId,
          ),

          hybridDiscoveryRepository.getAll(),
        ]);

        if (!localDiscovery) {
          setError(
            "Die Discovery wurde lokal nicht gefunden.",
          );

          setDiscovery(null);

          return;
        }

        setDiscovery(
          localDiscovery,
        );

        setAllDiscoveries(
          localDiscoveries,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Die Discovery konnte nicht geladen werden.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [discoveryId]);

  useEffect(() => {
    void loadDiscovery();
  }, [loadDiscovery]);

  async function handleOpenSource() {
    if (!discovery?.url) {
      return;
    }

    try {
      await Linking.openURL(
        discovery.url,
      );
    } catch {
      Alert.alert(
        "Link konnte nicht geöffnet werden",
        discovery.url,
      );
    }
  }

  function handleDelete() {
    if (!discovery) {
      return;
    }

    Alert.alert(
      "Discovery löschen?",
      "Diese Discovery wird vom Gerät entfernt. Falls das Backend nicht erreichbar ist, wird die Löschung später synchronisiert.",
      [
        {
          text: "Abbrechen",
          style: "cancel",
        },
        {
          text: "Löschen",
          style: "destructive",
          onPress: () => {
            void confirmDelete();
          },
        },
      ],
    );
  }

  async function confirmDelete() {
    if (!discovery) {
      return;
    }

    try {
      await hybridDiscoveryRepository.delete(
        discovery.id,
      );

      router.back();
    } catch (deleteError) {
      Alert.alert(
        "Löschen fehlgeschlagen",
        deleteError instanceof Error
          ? deleteError.message
          : "Die Discovery konnte nicht gelöscht werden.",
      );
    }
  }

  async function handleUpdate(
    update: DiscoveryUpdate,
  ) {
    if (!discovery) {
      return;
    }

    try {
      const updatedDiscovery =
        await hybridDiscoveryRepository.update(
          discovery.id,
          update,
        );

      setDiscovery(
        updatedDiscovery,
      );

      setAllDiscoveries(
        (currentDiscoveries) => [
          updatedDiscovery,

          ...currentDiscoveries.filter(
            (item) =>
              item.id !==
              updatedDiscovery.id,
          ),
        ],
      );

      setEditing(false);
    } catch (updateError) {
      Alert.alert(
        t("discovery.updateFailed"),

        updateError instanceof Error
          ? updateError.message
          : t(
              "discovery.updateFailedMessage",
            ),
      );
    }
  }

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <StarBackground density={65} />

        <View style={styles.centered}>
          <ActivityIndicator
            color={
              universeTheme.colors
                .primaryBright
            }
            size="large"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Discovery wird geladen …
          </Text>
        </View>
      </View>
    );
  }

  if (error || !discovery) {
    return (
      <View style={styles.screen}>
        <StarBackground density={65} />

        <View style={styles.centered}>
          <View
            style={
              styles.errorIcon
            }
          >
            <Ionicons
              color={
                universeTheme.colors
                  .danger
              }
              name="alert-circle-outline"
              size={30}
            />
          </View>

          <Text
            style={
              styles.errorTitle
            }
          >
            Discovery nicht verfügbar
          </Text>

          <Text
            style={
              styles.errorText
            }
          >
            {error ??
              "Die Discovery konnte nicht gefunden werden."}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.back();
            }}
            style={({ pressed }) => [
              styles.backButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color="#03111E"
              name="arrow-back"
              size={18}
            />

            <Text
              style={
                styles.backButtonText
              }
            >
              Zurück
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const classification =
    discovery.classification;

  const displayedTitle =
    discovery.improvedTitle ||
    discovery.title;

  const confidence =
    typeof discovery.confidence ===
    "number"
      ? Math.round(
          discovery.confidence *
            100,
        )
      : null;

  const displayedTopics =
    normalizeStrings([
      ...(classification?.subtopics ??
        []),

      ...discovery.topics,

      ...discovery.keywords,
    ]).slice(0, 12);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <StarBackground density={90} />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Zurück"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              router.back();
            }}
            style={({ pressed }) => [
              styles.topButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .text
              }
              name="arrow-back"
              size={21}
            />
          </Pressable>

          <View
            style={
              styles.topBarCenter
            }
          >
            <Text
              style={
                styles.topEyebrow
              }
            >
              DISCOVERY
            </Text>

            <Text
              style={
                styles.topTitle
              }
            >
              Knowledge Object
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Bearbeiten"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              setEditing(true);
            }}
            style={({ pressed }) => [
              styles.topButton,

              styles.editTopButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .primaryBright
              }
              name="create-outline"
              size={20}
            />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View
            style={
              styles.heroGlow
            }
          />

          <View
            style={
              styles.heroTopRow
            }
          >
            <View
              style={
                styles.sourceBadge
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name={getSourceIcon(
                  discovery.source,
                )}
                size={16}
              />

              <Text
                style={
                  styles.sourceBadgeText
                }
              >
                {formatSource(
                  discovery.source,
                )}
              </Text>
            </View>

            {confidence !== null ? (
              <View
                style={
                  styles.aiBadge
                }
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .green
                  }
                  name="sparkles"
                  size={13}
                />

                <Text
                  style={
                    styles.aiBadgeText
                  }
                >
                  KI {confidence} %
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>
            {displayedTitle}
          </Text>

          <View
            style={
              styles.metadataRow
            }
          >
            {discovery.author ? (
              <MetadataItem
                icon="person-outline"
                label={
                  discovery.author
                }
              />
            ) : null}

            {discovery.publishedAt ? (
              <MetadataItem
                icon="calendar-outline"
                label={formatDate(
                  discovery.publishedAt,
                  locale,
                )}
              />
            ) : null}

            <MetadataItem
              icon="time-outline"
              label={formatDate(
                discovery.createdAt,
                locale,
              )}
            />
          </View>

          {classification ? (
            <View
              style={
                styles.heroPath
              }
            >
              <View
                style={
                  styles.heroPathIcon
                }
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .violet
                  }
                  name="git-network-outline"
                  size={18}
                />
              </View>

              <View style={styles.flex}>
                <Text
                  style={
                    styles.heroPathLabel
                  }
                >
                  WISSENSPFAD
                </Text>

                <Text
                  style={
                    styles.heroPathText
                  }
                >
                  {classification.secondaryCategory}
                  {"  ›  "}
                  {classification.topic}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {discovery.summary ? (
          <ContentSection
            eyebrow="AI SYNTHESIS"
            icon="sparkles-outline"
            title="Zusammenfassung"
          >
            <Text
              style={styles.summary}
            >
              {compactSummary(
                discovery.summary,
              )}
            </Text>
          </ContentSection>
        ) : null}

        {classification ? (
          <ContentSection
            eyebrow="KNOWLEDGE UNIVERSE"
            icon="planet-outline"
            title="Einordnung"
          >
            <View
              style={
                styles.pathDiagram
              }
            >
              <PathLevel
                icon="planet-outline"
                label="Domäne"
                value={
                  classification.secondaryCategory
                }
              />

              <View
                style={
                  styles.pathConnector
                }
              />

              <PathLevel
                icon="git-branch-outline"
                label="Topic"
                value={
                  classification.topic
                }
              />
            </View>

            {classification.subtopics
              .length > 0 ? (
              <>
                <Text
                  style={
                    styles.smallSectionLabel
                  }
                >
                  UNTERTHEMEN
                </Text>

                <View
                  style={
                    styles.chips
                  }
                >
                  {classification.subtopics.map(
                    (subtopic) => (
                      <TopicChip
                        key={
                          subtopic
                        }
                        label={
                          subtopic
                        }
                      />
                    ),
                  )}
                </View>
              </>
            ) : null}
          </ContentSection>
        ) : null}

        {displayedTopics.length >
        0 ? (
          <ContentSection
            eyebrow="SIGNALS"
            icon="pricetags-outline"
            title="Schlagwörter"
          >
            <View style={styles.chips}>
              {displayedTopics.map(
                (topic) => (
                  <TopicChip
                    key={topic}
                    label={topic}
                  />
                ),
              )}
            </View>
          </ContentSection>
        ) : null}

        {confidence !== null ? (
          <ContentSection
            eyebrow="AI QUALITY"
            icon="analytics-outline"
            title="Vertrauen"
          >
            <View
              style={
                styles.confidenceCard
              }
            >
              <View
                style={
                  styles.confidenceHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.confidenceValue
                    }
                  >
                    {confidence} %
                  </Text>

                  <Text
                    style={
                      styles.confidenceLabel
                    }
                  >
                    KI-Klassifikation
                  </Text>
                </View>

                <View
                  style={
                    styles.confidenceStatus
                  }
                >
                  <View
                    style={
                      styles.confidenceDot
                    }
                  />

                  <Text
                    style={
                      styles.confidenceStatusText
                    }
                  >
                    {getConfidenceLabel(
                      confidence,
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.confidenceTrack
                }
              >
                <View
                  style={[
                    styles.confidenceFill,

                    {
                      width: `${confidence}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </ContentSection>
        ) : null}

        {discovery.url ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => {
              void handleOpenSource();
            }}
            style={({ pressed }) => [
              styles.sourceButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <View
              style={
                styles.sourceButtonIcon
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="open-outline"
                size={19}
              />
            </View>

            <View style={styles.flex}>
              <Text
                style={
                  styles.sourceButtonLabel
                }
              >
                ORIGINALQUELLE
              </Text>

              <Text
                style={
                  styles.sourceButtonText
                }
              >
                Quelle öffnen
              </Text>

              <Text
                numberOfLines={1}
                style={
                  styles.sourceUrl
                }
              >
                {discovery.url}
              </Text>
            </View>

            <Ionicons
              color={
                universeTheme.colors
                  .textMuted
              }
              name="chevron-forward"
              size={18}
            />
          </Pressable>
        ) : null}

        <View
          style={
            styles.relatedSection
          }
        >
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            AI CONNECTIONS
          </Text>

          <Text
            style={
              styles.sectionTitle
            }
          >
            Verwandte Discoveries
          </Text>

          <RelatedDiscoveries
            discoveryId={
              discovery.id
            }
            onSelectDiscovery={(
              relatedDiscovery,
            ) => {
              router.push(
                `/discovery/${relatedDiscovery.id}`,
              );
            }}
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setEditing(true);
            }}
            style={({ pressed }) => [
              styles.editButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color="#03111E"
              name="create-outline"
              size={19}
            />

            <Text
              style={
                styles.editButtonText
              }
            >
              {t("discovery.edit")}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .danger
              }
              name="trash-outline"
              size={19}
            />

            <Text
              style={
                styles.deleteButtonText
              }
            >
              {t("discovery.delete")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <DiscoveryEditModal
        discovery={discovery}
        existingMainTopics={
          existingMainTopics
        }
        labels={{
          title: t(
            "discovery.editTitle",
          ),

          description: t(
            "discovery.editDescription",
          ),

          titleField: t(
            "discovery.titleField",
          ),

          summary: t(
            "discovery.summaryField",
          ),

          secondaryCategory: t(
            "discovery.secondaryCategory",
          ),

          topic: t(
            "discovery.topic",
          ),

          subtopics: t(
            "discovery.subtopics",
          ),

          subtopicsHint: t(
            "discovery.subtopicsHint",
          ),

          cancel: t(
            "discovery.cancel",
          ),

          save: t(
            "discovery.save",
          ),

          saving: t(
            "discovery.saving",
          ),
        }}
        onClose={() => {
          setEditing(false);
        }}
        onSave={handleUpdate}
        visible={isEditing}
      />
    </View>
  );
}

function ContentSection({
  children,
  eyebrow,
  icon,
  title,
}: {
  children:
    React.ReactNode;
  eyebrow: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionCard}>
      <View
        style={
          styles.sectionCardHeader
        }
      >
        <View
          style={
            styles.sectionIcon
          }
        >
          <Ionicons
            color={
              universeTheme.colors
                .primaryBright
            }
            name={icon}
            size={20}
          />
        </View>

        <View style={styles.flex}>
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
      </View>

      <View
        style={
          styles.sectionContent
        }
      >
        {children}
      </View>
    </View>
  );
}

function MetadataItem({
  icon,
  label,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metadataItem}>
      <Ionicons
        color={
          universeTheme.colors
            .textMuted
        }
        name={icon}
        size={13}
      />

      <Text
        style={
          styles.metadataText
        }
      >
        {label}
      </Text>
    </View>
  );
}

function PathLevel({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.pathLevel}>
      <View
        style={
          styles.pathLevelIcon
        }
      >
        <Ionicons
          color={
            universeTheme.colors
              .violet
          }
          name={icon}
          size={18}
        />
      </View>

      <View style={styles.flex}>
        <Text
          style={
            styles.pathLevelLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.pathLevelValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function TopicChip({
  label,
}: {
  label: string;
}) {
  return (
    <View style={styles.chip}>
      <View style={styles.chipDot} />

      <Text
        style={styles.chipText}
      >
        {label}
      </Text>
    </View>
  );
}

function buildMainTopics(
  discoveries: Discovery[],
): string[] {
  const topics =
    new Map<string, string>();

  discoveries.forEach(
    (item) => {
      const mainTopic =
        normalizeTopicName(
          item.classification
            ?.secondaryCategory ??
            "",
        );

      if (!mainTopic) {
        return;
      }

      const key =
        mainTopic.toLocaleLowerCase();

      if (!topics.has(key)) {
        topics.set(
          key,
          mainTopic,
        );
      }
    },
  );

  return [...topics.values()].sort(
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

function normalizeStrings(
  values: string[],
): string[] {
  const unique =
    new Map<string, string>();

  values.forEach((value) => {
    const normalized =
      normalizeTopicName(value);

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

  return [...unique.values()];
}

function normalizeTopicName(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function getSourceIcon(
  source: Discovery["source"],
): keyof typeof Ionicons.glyphMap {
  switch (source) {
    case "youtube":
      return "logo-youtube";

    case "instagram":
      return "logo-instagram";

    case "facebook":
      return "logo-facebook";

    case "tiktok":
      return "musical-notes-outline";

    case "web":
    default:
      return "globe-outline";
  }
}

function formatSource(
  source: Discovery["source"],
): string {
  const labels: Record<
    Discovery["source"],
    string
  > = {
    youtube: "YouTube",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    web: "Web",
  };

  return labels[source];
}

function formatCategory(
  category: string,
): string {
  return category
    .split("_")
    .map(
      (word) =>
        word
          .charAt(0)
          .toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function formatDate(
  value: string,
  locale: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    locale,
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function compactSummary(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function getConfidenceLabel(
  confidence: number,
): string {
  if (confidence >= 85) {
    return "HIGH";
  }

  if (confidence >= 65) {
    return "MEDIUM";
  }

  return "LOW";
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor:
      universeTheme.colors
        .background,
    flex: 1,
  },

  content: {
    paddingBottom: 110,
    paddingHorizontal: 18,
    paddingTop: 55,
  },

  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },

  flex: {
    flex: 1,
  },

  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginBottom: 20,
  },

  topButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(71, 111, 148, 0.26)",
    borderColor:
      "rgba(148, 197, 229, 0.28)",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  editTopButton: {
    backgroundColor:
      "rgba(56, 189, 248, 0.13)",
    borderColor:
      universeTheme.colors
        .borderStrong,
  },

  topBarCenter: {
    alignItems: "center",
  },

  topEyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  topTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3,
  },

  heroCard: {
    backgroundColor:
      "rgba(32, 65, 96, 0.93)",
    borderColor:
      "rgba(125, 211, 252, 0.30)",
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    padding: 18,
  },

  heroGlow: {
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    height: 2,
    left: 0,
    opacity: 0.85,
    position: "absolute",
    right: 0,
    top: 0,
  },

  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
  },

  sourceBadge: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.12)",
    borderColor:
      "rgba(125, 211, 252, 0.30)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  sourceBadgeText: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },

  aiBadge: {
    alignItems: "center",
    backgroundColor:
      "rgba(74, 222, 128, 0.10)",
    borderColor:
      "rgba(74, 222, 128, 0.27)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  aiBadgeText: {
    color:
      universeTheme.colors.green,
    fontSize: 9,
    fontWeight: "900",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 32,
    marginTop: 17,
  },

  metadataRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },

  metadataItem: {
    alignItems: "center",
    backgroundColor:
      "rgba(15, 38, 62, 0.43)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  metadataText: {
    color: "#C0D0DF",
    fontSize: 9,
    fontWeight: "600",
  },

  heroPath: {
    alignItems: "center",
    backgroundColor:
      "rgba(50, 79, 112, 0.76)",
    borderColor:
      "rgba(167, 139, 250, 0.27)",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 17,
    padding: 13,
  },

  heroPathIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(139, 92, 246, 0.13)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  heroPathLabel: {
    color: "#9EB3C7",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  heroPathText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 3,
  },

  sectionCard: {
    backgroundColor:
      "rgba(32, 65, 96, 0.88)",
    borderColor:
      "rgba(148, 197, 229, 0.23)",
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
    padding: 17,
  },

  sectionCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },

  sectionIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.13)",
    borderRadius: 12,
    height: 41,
    justifyContent: "center",
    width: 41,
  },

  sectionEyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },

  sectionContent: {
    marginTop: 15,
  },

  summary: {
    color: "#E3EDF5",
    fontSize: 14,
    lineHeight: 23,
  },

  pathDiagram: {
    gap: 4,
  },

  pathLevel: {
    alignItems: "center",
    backgroundColor:
      "rgba(48, 81, 113, 0.72)",
    borderColor:
      "rgba(148, 197, 229, 0.20)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 12,
  },

  pathLevelIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(139, 92, 246, 0.12)",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },

  pathLevelLabel: {
    color: "#9CB0C4",
    fontSize: 9,
    fontWeight: "800",
  },

  pathLevelValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },

  pathConnector: {
    backgroundColor:
      "rgba(125, 211, 252, 0.35)",
    height: 10,
    marginLeft: 29,
    width: 1,
  },

  smallSectionLabel: {
    color: "#A7BED2",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 18,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  chip: {
    alignItems: "center",
    backgroundColor:
      "rgba(59, 88, 120, 0.88)",
    borderColor:
      "rgba(167, 139, 250, 0.30)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  chipDot: {
    backgroundColor:
      universeTheme.colors.violet,
    borderRadius: 999,
    height: 5,
    width: 5,
  },

  chipText: {
    color: "#E4EDF5",
    fontSize: 10,
    fontWeight: "700",
  },

  confidenceCard: {
    backgroundColor:
      "rgba(48, 81, 113, 0.72)",
    borderColor:
      "rgba(74, 222, 128, 0.24)",
    borderRadius: 15,
    borderWidth: 1,
    padding: 14,
  },

  confidenceHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
  },

  confidenceValue: {
    color:
      universeTheme.colors.green,
    fontSize: 25,
    fontWeight: "900",
  },

  confidenceLabel: {
    color: "#B6C8D8",
    fontSize: 10,
    marginTop: 3,
  },

  confidenceStatus: {
    alignItems: "center",
    backgroundColor:
      "rgba(74, 222, 128, 0.09)",
    borderColor:
      "rgba(74, 222, 128, 0.24)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  confidenceDot: {
    backgroundColor:
      universeTheme.colors.green,
    borderRadius: 999,
    height: 6,
    width: 6,
  },

  confidenceStatusText: {
    color:
      universeTheme.colors.green,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  confidenceTrack: {
    backgroundColor:
      "rgba(15, 38, 62, 0.52)",
    borderRadius: 999,
    height: 7,
    marginTop: 13,
    overflow: "hidden",
  },

  confidenceFill: {
    backgroundColor:
      universeTheme.colors.green,
    borderRadius: 999,
    height: 7,
  },

  sourceButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(32, 65, 96, 0.88)",
    borderColor:
      "rgba(125, 211, 252, 0.28)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    marginTop: 16,
    padding: 15,
  },

  sourceButtonIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.13)",
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  sourceButtonLabel: {
    color:
      universeTheme.colors.primary,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.9,
  },

  sourceButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },

  sourceUrl: {
    color: "#9EB3C7",
    fontSize: 9,
    marginTop: 3,
  },

  relatedSection: {
    marginTop: 30,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 26,
  },

  editButton: {
    alignItems: "center",
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 16,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 53,
  },

  editButtonText: {
    color: "#03111E",
    fontSize: 13,
    fontWeight: "900",
  },

  deleteButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(248, 113, 113, 0.10)",
    borderColor:
      "rgba(248, 113, 113, 0.30)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 53,
  },

  deleteButtonText: {
    color:
      universeTheme.colors.danger,
    fontSize: 13,
    fontWeight: "900",
  },

  loadingText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 13,
    marginTop: 14,
  },

  errorIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(248, 113, 113, 0.10)",
    borderRadius: 999,
    height: 66,
    justifyContent: "center",
    marginBottom: 16,
    width: 66,
  },

  errorTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },

  errorText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },

  backButton: {
    alignItems: "center",
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },

  backButtonText: {
    color: "#03111E",
    fontSize: 13,
    fontWeight: "900",
  },

  pressed: {
    opacity: 0.7,
  },
});
