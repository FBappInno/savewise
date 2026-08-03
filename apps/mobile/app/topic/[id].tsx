import { Ionicons } from "@expo/vector-icons";
import {
  router,
  Stack,
  useLocalSearchParams,
} from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DiscoveryCard } from "@/components/discovery-card";
import { useKnowledgeLibrary } from "@/hooks/use-knowledge-library";
import { theme } from "@/theme";
import type { Discovery } from "@/types/discovery";

export default function TopicDetailScreen() {
  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const topicId =
    typeof params.id === "string"
      ? params.id
      : params.id?.[0] ?? "";

  const {
    library,
    isLoading,
    error,
  } = useKnowledgeLibrary();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />

        <Text style={styles.loadingText}>
          Loading topic...
        </Text>
      </View>
    );
  }

  const topic =
    library?.topics.find(
      (item) => item.id === topicId,
    );

  if (
    error ||
    !library ||
    !topic
  ) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>
          Topic unavailable
        </Text>

        <Text style={styles.errorText}>
          {error ??
            "This topic could not be found."}
        </Text>
      </View>
    );
  }

  const discoveries =
    library.discoveries.filter(
      (discovery) =>
        getTopicId(discovery) ===
        topic.id,
    );

  const connections =
    library.relations
      .filter(
        (relation) =>
          relation.sourceId ===
            topic.id ||
          relation.targetId ===
            topic.id,
      )
      .map((relation) => {
        const relatedTopicId =
          relation.sourceId ===
          topic.id
            ? relation.targetId
            : relation.sourceId;

        return {
          relation,

          topic:
            library.topics.find(
              (item) =>
                item.id ===
                relatedTopicId,
            ) ?? null,
        };
      })
      .filter(
        (item) =>
          item.topic !== null,
      );

  function openDiscovery(
    discovery: Discovery,
  ) {
    router.push(
      `/discovery/${discovery.id}`,
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: topic.name,
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
        <Text style={styles.eyebrow}>
          KNOWLEDGE TOPIC
        </Text>

        <Text style={styles.title}>
          {topic.name}
        </Text>

        <Text style={styles.subtitle}>
          {topic.discoveries}{" "}
          {topic.discoveries === 1
            ? "discovery"
            : "discoveries"}{" "}
          in this topic
        </Text>

        {topic.keywords.length > 0 ? (
          <View style={styles.chips}>
            {topic.keywords.map(
              (keyword) => (
                <View
                  key={keyword}
                  style={styles.chip}
                >
                  <Text
                    style={styles.chipText}
                  >
                    {keyword}
                  </Text>
                </View>
              ),
            )}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Discoveries
          </Text>

          <View
            style={styles.discoveryList}
          >
            {discoveries.map(
              (discovery) => (
                <DiscoveryCard
                  discovery={discovery}
                  key={discovery.id}
                  onPress={
                    openDiscovery
                  }
                />
              ),
            )}
          </View>
        </View>

        {connections.length > 0 ? (
          <View style={styles.section}>
            <Text
              style={styles.sectionTitle}
            >
              Connected topics
            </Text>

            <View
              style={styles.connectionList}
            >
              {connections.map(
                ({
                  relation,
                  topic:
                    connectedTopic,
                }) => {
                  if (!connectedTopic) {
                    return null;
                  }

                  return (
                    <View
                      key={
                        connectedTopic.id
                      }
                      style={
                        styles.connectionCard
                      }
                    >
                      <View
                        style={
                          styles.connectionHeader
                        }
                      >
                        <Ionicons
                          color={
                            theme.colors.primary
                          }
                          name="git-network-outline"
                          size={20}
                        />

                        <Text
                          style={
                            styles.connectionTitle
                          }
                        >
                          {
                            connectedTopic.name
                          }
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.connectionReason
                        }
                      >
                        {relation.reason}
                      </Text>

                      <Text
                        style={
                          styles.connectionScore
                        }
                      >
                        {Math.round(
                          relation.strength *
                            100,
                        )}
                        % connection
                      </Text>
                    </View>
                  );
                },
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

function getTopicId(
  discovery: Discovery,
): string {
  const topic =
    discovery.classification?.topic ||
    discovery.topics[0] ||
    "Uncategorized";

  const slug = topic
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );

  return slug || "uncategorized";
}

const styles = StyleSheet.create({
  content: {
    backgroundColor:
      theme.colors.background,

    paddingBottom:
      theme.spacing.xxxl,

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

  eyebrow: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    letterSpacing: 1.2,
  },

  title: {
    ...theme.typography.screenTitle,

    color:
      theme.colors.text,

    marginTop:
      theme.spacing.sm,
  },

  subtitle: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.sm,
  },

  chips: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.sm,

    marginTop:
      theme.spacing.xl,
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

  section: {
    marginTop:
      theme.spacing.xxxl,
  },

  sectionTitle: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,

    marginBottom:
      theme.spacing.lg,
  },

  discoveryList: {
    gap:
      theme.spacing.lg,
  },

  connectionList: {
    gap:
      theme.spacing.md,
  },

  connectionCard: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    padding:
      theme.spacing.lg,
  },

  connectionHeader: {
    alignItems: "center",

    flexDirection: "row",

    gap:
      theme.spacing.sm,
  },

  connectionTitle: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.text,
  },

  connectionReason: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.md,
  },

  connectionScore: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    marginTop:
      theme.spacing.sm,
  },
});