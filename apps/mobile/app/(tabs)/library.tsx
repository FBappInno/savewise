import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useRef } from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";

import { KnowledgeTree } from "@/components/library/knowledge-tree";
import { useKnowledgeLibrary } from "@/hooks/use-knowledge-library";
import { theme } from "@/theme";
import type { Discovery } from "@/types/discovery";

export default function LibraryScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const treePosition = useRef(0);
  const {
    library,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useKnowledgeLibrary();

  const graph = library?.graph ?? null;
  const activity = useMemo(
    () => calculateActivity(library?.discoveries ?? []),
    [library?.discoveries],
  );

  function openDiscovery(
    discovery: Discovery,
  ) {
    router.push(
      `/discovery/${discovery.id}`,
    );
  }

  function openDiscoveries() {
    router.push("/");
  }

  function scrollToTopics() {
    scrollViewRef.current?.scrollTo({
      animated: true,
      y: Math.max(0, treePosition.current - 24),
    });
  }

  function saveTreePosition(event: LayoutChangeEvent) {
    treePosition.current = event.nativeEvent.layout.y;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      ref={scrollViewRef}
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
          AI KNOWLEDGE TREE
        </Text>

        <Text style={styles.title}>
          Library
        </Text>

        <Text style={styles.subtitle}>
          SaveWise continuously organizes
          your discoveries into a personal
          hierarchy of domains, topics and
          concepts.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />

          <Text style={styles.loadingText}>
            Building your personal
            knowledge tree...
          </Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <MessageCard
          message={error}
          title="Library unavailable"
        />
      ) : null}

      {!isLoading &&
      library &&
      !error &&
      !graph ? (
        <MessageCard
          message="Pull down to let SaveWise build the AI knowledge tree."
          title="Knowledge tree unavailable"
        />
      ) : null}

      {!isLoading &&
      library &&
      !error &&
      graph ? (
        <>
          <View>
            <Text style={styles.mapLabel}>
              PERSONAL KNOWLEDGE MAP
            </Text>

            <View style={styles.metricGrid}>
              <MetricCard
                icon="documents-outline"
                label="Saved entries"
                onPress={openDiscoveries}
                value={library.discoveries.length}
              />

              <MetricCard
                icon="folder-open-outline"
                label="Topics"
                onPress={scrollToTopics}
                value={
                  graph.nodes.filter(
                    (node) => node.kind === "topic",
                  ).length
                }
              />

              <MetricCard
                icon="today-outline"
                label="Added today"
                onPress={openDiscoveries}
                value={activity.today}
              />

              <MetricCard
                icon="calendar-outline"
                label="Last 7 days"
                onPress={openDiscoveries}
                value={activity.last7Days}
              />
            </View>
          </View>

          <View
            onLayout={saveTreePosition}
            style={styles.treeSection}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Your knowledge
              </Text>

              <Text style={styles.language}>
                {graph.language.toUpperCase()}
              </Text>
            </View>

            <KnowledgeTree
              discoveries={library.discoveries}
              graph={graph}
              onOpenDiscovery={openDiscovery}
            />
          </View>

          <View style={styles.generatedCard}>
            <Ionicons
              color={theme.colors.textSecondary}
              name="time-outline"
              size={16}
            />

            <Text style={styles.generatedText}>
              Knowledge tree updated{" "}
              {formatDate(graph.generatedAt)}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function MetricCard({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.metricCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.metricIcon}>
        <Ionicons
          color={theme.colors.primary}
          name={icon}
          size={20}
        />
      </View>

      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

function calculateActivity(discoveries: Discovery[]) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  return discoveries.reduce(
    (counts, discovery) => {
      const createdAt = new Date(discovery.createdAt).getTime();

      if (!Number.isFinite(createdAt)) {
        return counts;
      }

      if (createdAt >= startOfToday) {
        counts.today += 1;
      }

      if (createdAt >= sevenDaysAgo) {
        counts.last7Days += 1;
      }

      return counts;
    },
    { today: 0, last7Days: 0 },
  );
}

function MessageCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View style={styles.messageCard}>
      <Text style={styles.messageTitle}>
        {title}
      </Text>

      <Text style={styles.messageText}>
        {message}
      </Text>
    </View>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxxl,
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  eyebrow: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    letterSpacing: 1.2,
  },
  title: {
    ...theme.typography.screenTitle,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginTop: theme.spacing.sm,
  },
  centered: {
    alignItems: "center",
    paddingVertical: theme.spacing.xxxl,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  mapLabel: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    minHeight: 132,
    padding: theme.spacing.lg,
    width: "47%",
  },
  metricIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  metricValue: {
    ...theme.typography.screenTitle,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  metricLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  treeSection: {
    marginTop: theme.spacing.xxxl,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.text,
  },
  language: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  messageCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  messageTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.text,
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    marginTop: theme.spacing.sm,
  },
  generatedCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    marginTop: theme.spacing.xxxl,
    padding: theme.spacing.md,
  },
  generatedText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
