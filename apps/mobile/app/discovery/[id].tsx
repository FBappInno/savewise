import { Ionicons } from "@expo/vector-icons";
import {
  router,
  Stack,
  useLocalSearchParams,
} from "expo-router";
import {
  useCallback,
  useEffect,
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
import { hybridDiscoveryRepository } from "@/repositories/hybrid-discovery-repository";
import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";
import type {
  Discovery,
  DiscoveryUpdate,
} from "@/types/discovery";

export default function DiscoveryDetailScreen() {
  const { locale, t } =
    useAppSettings();

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

  const loadDiscovery =
    useCallback(async () => {
      if (!discoveryId) {
        setError(
          "No discovery ID was provided.",
        );

        setIsLoading(false);

        return;
      }

      setError(null);
      setIsLoading(true);

      try {
        const localDiscovery =
          await hybridDiscoveryRepository.getById(
            discoveryId,
          );

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
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Discovery could not be loaded.",
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
        "Link could not be opened",
        discovery.url,
      );
    }
  }

  function handleDelete() {
    if (!discovery) {
      return;
    }

    Alert.alert(
      "Delete discovery?",
      "This discovery will be removed from this device. If the server is unavailable, the remote deletion will be synchronized later.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
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
        "Deletion failed",
        deleteError instanceof Error
          ? deleteError.message
          : "The discovery could not be deleted.",
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
      <View style={styles.centered}>
        <ActivityIndicator />

        <Text style={styles.loadingText}>
          Loading discovery...
        </Text>
      </View>
    );
  }

  if (error || !discovery) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>
          Discovery unavailable
        </Text>

        <Text style={styles.errorText}>
          {error ??
            "The discovery could not be found."}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.back();
          }}
          style={styles.backButton}
        >
          <Text
            style={
              styles.backButtonText
            }
          >
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const classification =
    discovery.classification;

  const displayedTitle =
    discovery.improvedTitle ||
    discovery.title;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Discovery",
        }}
      />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Text style={styles.source}>
          {formatSource(
            discovery.source,
          )}
        </Text>

        <Text style={styles.title}>
          {displayedTitle}
        </Text>

        <View
          style={styles.metadataRow}
        >
          {discovery.author ? (
            <Text
              style={styles.metadata}
            >
              {discovery.author}
            </Text>
          ) : null}

          {discovery.publishedAt ? (
            <Text
              style={styles.metadata}
            >
              {formatDate(
                discovery.publishedAt,
                locale,
              )}
            </Text>
          ) : null}

          <Text
            style={styles.metadata}
          >
            {formatDate(
              discovery.createdAt,
              locale,
            )}
          </Text>
        </View>

        {discovery.summary ? (
          <View style={styles.section}>
            <Text
              style={styles.eyebrow}
            >
              AI SUMMARY
            </Text>

            <Text
              style={styles.summary}
            >
              {compactSummary(
                discovery.summary,
              )}
            </Text>
          </View>
        ) : null}

        {classification ? (
          <View style={styles.section}>
            <Text
              style={styles.eyebrow}
            >
              KNOWLEDGE PATH
            </Text>

            <View
              style={
                styles.knowledgePath
              }
            >
              <KnowledgePathItem
                label={formatCategory(
                  classification.primaryCategory,
                )}
              />

              <Ionicons
                color={
                  theme.colors
                    .textSecondary
                }
                name="chevron-forward"
                size={16}
              />

              <KnowledgePathItem
                label={
                  classification.secondaryCategory
                }
              />

              <Ionicons
                color={
                  theme.colors
                    .textSecondary
                }
                name="chevron-forward"
                size={16}
              />

              <KnowledgePathItem
                label={
                  classification.topic
                }
              />
            </View>

            {classification.subtopics
              .length > 0 ? (
              <View style={styles.chips}>
                {classification.subtopics.map(
                  (subtopic) => (
                    <View
                      key={subtopic}
                      style={styles.chip}
                    >
                      <Text
                        style={
                          styles.chipText
                        }
                      >
                        {subtopic}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            ) : null}
          </View>
        ) : null}

        {discovery.keywords.length >
        0 ? (
          <View style={styles.section}>
            <Text
              style={styles.eyebrow}
            >
              KEYWORDS
            </Text>

            <View style={styles.chips}>
              {discovery.keywords.map(
                (keyword) => (
                  <View
                    key={keyword}
                    style={styles.chip}
                  >
                    <Text
                      style={
                        styles.chipText
                      }
                    >
                      {keyword}
                    </Text>
                  </View>
                ),
              )}
            </View>
          </View>
        ) : null}

        {typeof discovery.confidence ===
        "number" ? (
          <View style={styles.section}>
            <Text
              style={styles.eyebrow}
            >
              AI CONFIDENCE
            </Text>

            <View
              style={
                styles.confidenceCard
              }
            >
              <Text
                style={
                  styles.confidenceValue
                }
              >
                {Math.round(
                  discovery.confidence *
                    100,
                )}
                %
              </Text>

              <View
                style={
                  styles.confidenceTrack
                }
              >
                <View
                  style={[
                    styles.confidenceFill,
                    {
                      width: `${Math.round(
                        discovery.confidence *
                          100,
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
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
            <Ionicons
              color={
                theme.colors.primary
              }
              name="open-outline"
              size={18}
            />

            <Text
              style={
                styles.sourceButtonText
              }
            >
              Open original source
            </Text>
          </Pressable>
        ) : null}

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
              color={
                theme.colors.primary
              }
              name="create-outline"
              size={18}
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
              color="#B42318"
              name="trash-outline"
              size={18}
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
        labels={{
          title:
            t(
              "discovery.editTitle",
            ),

          description:
            t(
              "discovery.editDescription",
            ),

          titleField:
            t(
              "discovery.titleField",
            ),

          summary:
            t(
              "discovery.summaryField",
            ),

          primaryCategory:
            t(
              "discovery.primaryCategory",
            ),

          secondaryCategory:
            t(
              "discovery.secondaryCategory",
            ),

          topic:
            t(
              "discovery.topic",
            ),

          subtopics:
            t(
              "discovery.subtopics",
            ),

          subtopicsHint:
            t(
              "discovery.subtopicsHint",
            ),

          cancel:
            t(
              "discovery.cancel",
            ),

          save:
            t(
              "discovery.save",
            ),

          saving:
            t(
              "discovery.saving",
            ),
        }}
        onClose={() => {
          setEditing(false);
        }}
        onSave={handleUpdate}
        visible={isEditing}
      />
    </>
  );
}

type KnowledgePathItemProps = {
  label: string;
};

function KnowledgePathItem({
  label,
}: KnowledgePathItemProps) {
  return (
    <Text
      numberOfLines={2}
      style={
        styles.knowledgePathText
      }
    >
      {label}
    </Text>
  );
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
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function formatDate(
  value: string,
  locale: string,
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
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

const styles = StyleSheet.create({
  content: {
    backgroundColor:
      theme.colors.background,

    paddingBottom: 80,

    paddingHorizontal:
      theme.spacing.xl,

    paddingTop:
      theme.spacing.xl,
  },

  centered: {
    alignItems: "center",

    backgroundColor:
      theme.colors.background,

    flex: 1,

    justifyContent: "center",

    padding:
      theme.spacing.xl,
  },

  loadingText: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.md,
  },

  errorTitle: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,

    textAlign: "center",
  },

  errorText: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.sm,

    textAlign: "center",
  },

  backButton: {
    backgroundColor:
      theme.colors.primary,

    borderRadius:
      theme.radius.lg,

    marginTop:
      theme.spacing.xl,

    paddingHorizontal:
      theme.spacing.xl,

    paddingVertical:
      theme.spacing.md,
  },

  backButtonText: {
    ...theme.typography.button,

    color:
      theme.colors.textOnPrimary,
  },

  source: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    letterSpacing: 1,

    textTransform: "uppercase",
  },

  title: {
    ...theme.typography.screenTitle,

    color:
      theme.colors.text,

    marginTop:
      theme.spacing.sm,
  },

  metadataRow: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.sm,

    marginTop:
      theme.spacing.md,
  },

  metadata: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },

  section: {
    marginTop:
      theme.spacing.xxxl,
  },

  eyebrow: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    letterSpacing: 1.1,
  },

  summary: {
    ...theme.typography.body,

    color:
      theme.colors.text,

    lineHeight: 23,

    marginTop:
      theme.spacing.md,
  },

  knowledgePath: {
    alignItems: "center",

    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.sm,

    marginTop:
      theme.spacing.md,
  },

  knowledgePathText: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.text,

    flexShrink: 1,
  },

  chips: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.sm,

    marginTop:
      theme.spacing.md,
  },

  chip: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius: 999,

    borderWidth: 1,

    paddingHorizontal:
      theme.spacing.md,

    paddingVertical:
      theme.spacing.sm,
  },

  chipText: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,
  },

  confidenceCard: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    marginTop:
      theme.spacing.md,

    padding:
      theme.spacing.lg,
  },

  confidenceValue: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,
  },

  confidenceTrack: {
    backgroundColor:
      theme.colors.background,

    borderRadius: 999,

    height: 8,

    marginTop:
      theme.spacing.md,

    overflow: "hidden",
  },

  confidenceFill: {
    backgroundColor:
      theme.colors.primary,

    borderRadius: 999,

    height: "100%",
  },

  sourceButton: {
    alignItems: "center",

    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    flexDirection: "row",

    gap:
      theme.spacing.sm,

    justifyContent: "center",

    marginTop:
      theme.spacing.xxxl,

    padding:
      theme.spacing.lg,
  },

  sourceButtonText: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.primary,
  },

  actionRow: {
    flexDirection: "row",

    gap:
      theme.spacing.md,

    marginTop:
      theme.spacing.xxxl,
  },

  editButton: {
    alignItems: "center",

    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.primary,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    flex: 1,

    flexDirection: "row",

    gap:
      theme.spacing.sm,

    justifyContent: "center",

    padding:
      theme.spacing.lg,
  },

  editButtonText: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.primary,
  },

  deleteButton: {
    alignItems: "center",

    backgroundColor: "#FFF5F4",

    borderColor: "#FECACA",

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    flex: 1,

    flexDirection: "row",

    gap:
      theme.spacing.sm,

    justifyContent: "center",

    padding:
      theme.spacing.lg,
  },

  deleteButtonText: {
    ...theme.typography.bodyStrong,

    color: "#B42318",
  },

  pressed: {
    opacity: 0.7,
  },
});