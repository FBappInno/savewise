import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useKnowledgeLibrary } from "@/hooks/use-knowledge-library";
import { theme } from "@/theme";
import type {
  Interest,
  Topic,
} from "@savewise/shared";

export default function LibraryScreen() {
  const {
    library,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useKnowledgeLibrary();

  function openTopic(topicId: string) {
    router.push(`/topic/${topicId}`);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            void refresh();
          }}
        />
      }
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          PERSONAL KNOWLEDGE
        </Text>

        <Text style={styles.title}>
          Library
        </Text>

        <Text style={styles.subtitle}>
          Explore your saved knowledge by
          topics and interests.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />

          <Text style={styles.loadingText}>
            Building your library...
          </Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>
            Library unavailable
          </Text>

          <Text style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : null}

      {!isLoading &&
      library &&
      !error ? (
        <>
          <View style={styles.overview}>
            <OverviewItem
              label="Discoveries"
              value={
                library.discoveries.length
              }
            />

            <OverviewItem
              label="Topics"
              value={library.topics.length}
            />

            <OverviewItem
              label="Connections"
              value={
                library.relations.length
              }
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Strongest interests
            </Text>

            {library.interests.length >
            0 ? (
              <View style={styles.interestList}>
                {library.interests
                  .slice(0, 6)
                  .map((interest) => (
                    <InterestRow
                      interest={interest}
                      key={interest.id}
                      onPress={() => {
                        openTopic(
                          interest.id,
                        );
                      }}
                    />
                  ))}
              </View>
            ) : (
              <EmptyLibraryMessage />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Topics
            </Text>

            {library.topics.length > 0 ? (
              <View style={styles.topicGrid}>
                {library.topics.map(
                  (topic) => (
                    <TopicCard
                      key={topic.id}
                      onPress={() => {
                        openTopic(topic.id);
                      }}
                      topic={topic}
                    />
                  ),
                )}
              </View>
            ) : (
              <EmptyLibraryMessage />
            )}
          </View>

          {library.relations.length >
          0 ? (
            <View style={styles.section}>
              <Text
                style={styles.sectionTitle}
              >
                Topic connections
              </Text>

              <View
                style={styles.connectionList}
              >
                {library.relations
                  .slice(0, 8)
                  .map((relation) => {
                    const sourceTopic =
                      library.topics.find(
                        (topic) =>
                          topic.id ===
                          relation.sourceId,
                      );

                    const targetTopic =
                      library.topics.find(
                        (topic) =>
                          topic.id ===
                          relation.targetId,
                      );

                    if (
                      !sourceTopic ||
                      !targetTopic
                    ) {
                      return null;
                    }

                    return (
                      <Pressable
                        key={`${relation.sourceId}-${relation.targetId}`}
                        onPress={() => {
                          openTopic(
                            sourceTopic.id,
                          );
                        }}
                        style={({
                          pressed,
                        }) => [
                          styles.connectionCard,
                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <View
                          style={
                            styles.connectionHeader
                          }
                        >
                          <Text
                            numberOfLines={1}
                            style={
                              styles.connectionTopic
                            }
                          >
                            {sourceTopic.name}
                          </Text>

                          <Ionicons
                            color={
                              theme.colors
                                .textSecondary
                            }
                            name="git-compare-outline"
                            size={18}
                          />

                          <Text
                            numberOfLines={1}
                            style={
                              styles.connectionTopic
                            }
                          >
                            {targetTopic.name}
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
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

type OverviewItemProps = {
  label: string;
  value: number;
};

function OverviewItem({
  label,
  value,
}: OverviewItemProps) {
  return (
    <View style={styles.overviewItem}>
      <Text style={styles.overviewValue}>
        {value}
      </Text>

      <Text style={styles.overviewLabel}>
        {label}
      </Text>
    </View>
  );
}

type InterestRowProps = {
  interest: Interest;
  onPress: () => void;
};

function InterestRow({
  interest,
  onPress,
}: InterestRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.interestRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.interestContent}>
        <View style={styles.interestHeader}>
          <Text
            numberOfLines={1}
            style={styles.interestName}
          >
            {interest.name}
          </Text>

          <Text style={styles.interestCount}>
            {interest.discoveries}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(
                  interest.score * 100,
                )}%`,
              },
            ]}
          />
        </View>
      </View>

      <Ionicons
        color={theme.colors.textSecondary}
        name="chevron-forward"
        size={18}
      />
    </Pressable>
  );
}

type TopicCardProps = {
  topic: Topic;
  onPress: () => void;
};

function TopicCard({
  topic,
  onPress,
}: TopicCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.topicCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topicIcon}>
        <Ionicons
          color={theme.colors.primary}
          name="folder-open-outline"
          size={20}
        />
      </View>

      <Text
        numberOfLines={2}
        style={styles.topicName}
      >
        {topic.name}
      </Text>

      <Text style={styles.topicCount}>
        {topic.discoveries}{" "}
        {topic.discoveries === 1
          ? "discovery"
          : "discoveries"}
      </Text>

      {topic.keywords.length > 0 ? (
        <Text
          numberOfLines={2}
          style={styles.topicKeywords}
        >
          {topic.keywords
            .slice(0, 4)
            .join(" · ")}
        </Text>
      ) : null}
    </Pressable>
  );
}

function EmptyLibraryMessage() {
  return (
    <View style={styles.messageCard}>
      <Text style={styles.messageTitle}>
        No topics yet
      </Text>

      <Text style={styles.messageText}>
        Add more discoveries to build
        your personal knowledge library.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor:
      theme.colors.background,
  },

  content: {
    paddingBottom:
      theme.spacing.xxxl,

    paddingHorizontal:
      theme.spacing.xl,

    paddingTop:
      theme.spacing.xxxl,
  },

  header: {
    marginBottom:
      theme.spacing.xxl,
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

    lineHeight: 22,

    marginTop:
      theme.spacing.sm,
  },

  centered: {
    alignItems: "center",

    paddingVertical:
      theme.spacing.xxxl,
  },

  loadingText: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.md,
  },

  overview: {
    flexDirection: "row",

    gap:
      theme.spacing.md,
  },

  overviewItem: {
    alignItems: "center",

    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    flex: 1,

    paddingHorizontal:
      theme.spacing.sm,

    paddingVertical:
      theme.spacing.lg,
  },

  overviewValue: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,
  },

  overviewLabel: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.xs,

    textAlign: "center",
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

  interestList: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    overflow: "hidden",
  },

  interestRow: {
    alignItems: "center",

    borderBottomColor:
      theme.colors.border,

    borderBottomWidth: 1,

    flexDirection: "row",

    gap:
      theme.spacing.md,

    padding:
      theme.spacing.lg,
  },

  interestContent: {
    flex: 1,
  },

  interestHeader: {
    flexDirection: "row",

    justifyContent:
      "space-between",
  },

  interestName: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.text,

    flex: 1,
  },

  interestCount: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    marginLeft:
      theme.spacing.sm,
  },

  progressTrack: {
    backgroundColor:
      theme.colors.background,

    borderRadius: 999,

    height: 6,

    marginTop:
      theme.spacing.sm,

    overflow: "hidden",
  },

  progressFill: {
    backgroundColor:
      theme.colors.primary,

    borderRadius: 999,

    height: "100%",
  },

  topicGrid: {
    flexDirection: "row",

    flexWrap: "wrap",

    gap:
      theme.spacing.md,
  },

  topicCard: {
    backgroundColor:
      theme.colors.surface,

    borderColor:
      theme.colors.border,

    borderRadius:
      theme.radius.lg,

    borderWidth: 1,

    minHeight: 160,

    padding:
      theme.spacing.lg,

    width: "47%",
  },

  topicIcon: {
    alignItems: "center",

    backgroundColor:
      theme.colors.background,

    borderRadius: 999,

    height: 38,

    justifyContent: "center",

    width: 38,
  },

  topicName: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.text,

    marginTop:
      theme.spacing.md,
  },

  topicCount: {
    ...theme.typography.caption,

    color:
      theme.colors.primary,

    marginTop:
      theme.spacing.sm,
  },

  topicKeywords: {
    ...theme.typography.caption,

    color:
      theme.colors.textSecondary,

    lineHeight: 17,

    marginTop:
      theme.spacing.sm,
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

  connectionTopic: {
    ...theme.typography.bodyStrong,

    color:
      theme.colors.text,

    flex: 1,
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

  messageCard: {
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

  messageTitle: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,
  },

  messageText: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.sm,
  },

  pressed: {
    opacity: 0.7,
  },
});