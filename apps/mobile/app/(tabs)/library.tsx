import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { TopicManagementModal } from "@/components/library/topic-management-modal";
import { useKnowledgeLibrary } from "@/hooks/use-knowledge-library";
import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";
import type { Discovery } from "@/types/discovery";
import { updateKnowledgeTopic } from "@/services/content-import-client";
import { trackAnonymousEvent } from "@/services/anonymous-analytics";

export default function LibraryScreen() {
  const { settings, t } = useAppSettings();
  const scrollViewRef = useRef<ScrollView>(null);
  const treePosition = useRef(0);
  const [isManagingTopics, setIsManagingTopics] = useState(false);
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

  useEffect(() => {
    void trackAnonymousEvent("LibraryOpened", { operation: "library" });
  }, []);

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

  async function saveTopicChanges(
    nodeId: string,
    update: { title: string; parentId: string | null },
  ) {
    await updateKnowledgeTopic(nodeId, update);
    await refresh();
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
          {t("library.eyebrow")}
        </Text>

        <Text style={styles.title}>
          {t("library.title")}
        </Text>

        <Text style={styles.subtitle}>
          {t("library.subtitle")}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator />

          <Text style={styles.loadingText}>
            {t("library.loading")}
          </Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <MessageCard
          message={error}
          title={t("library.unavailable")}
        />
      ) : null}

      {!settings.ai.knowledgeGraph ? (
        <MessageCard
          message={t("library.disabled")}
          title={t("library.unavailable")}
        />
      ) : null}

      {!isLoading &&
      library &&
      !error &&
      !graph &&
      settings.ai.knowledgeGraph ? (
        <MessageCard
          message="Pull down to let SaveWise build the AI knowledge tree."
          title="Knowledge tree unavailable"
        />
      ) : null}

      {!isLoading &&
      library &&
      !error &&
      graph &&
      settings.ai.knowledgeGraph ? (
        <>
          <View>
            <Text style={styles.mapLabel}>
              {t("library.map")}
            </Text>

            <View style={styles.metricGrid}>
              <MetricCard
                icon="documents-outline"
                label={t("library.savedEntries")}
                onPress={openDiscoveries}
                value={library.discoveries.length}
              />

              <MetricCard
                icon="folder-open-outline"
                label={t("library.topics")}
                onPress={scrollToTopics}
                value={
                  graph.nodes.filter(
                    (node) => node.kind === "topic",
                  ).length
                }
              />

              <MetricCard
                icon="today-outline"
                label={t("library.today")}
                onPress={openDiscoveries}
                value={activity.today}
              />

              <MetricCard
                icon="calendar-outline"
                label={t("library.last7Days")}
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
                {t("library.knowledge")}
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

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsManagingTopics(true)}
              style={({ pressed }) => [
                styles.manageTopicsButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons color={theme.colors.primary} name="options-outline" size={19} />
              <Text style={styles.manageTopicsText}>{t("library.manageTopics")}</Text>
            </Pressable>
          </View>

          <TopicManagementModal
            graph={graph}
            onClose={() => setIsManagingTopics(false)}
            onSave={saveTopicChanges}
            visible={isManagingTopics}
          />

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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxxl + theme.spacing.sm,
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
  manageTopicsButton: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    marginTop: theme.spacing.xl,
    minHeight: 48,
    paddingHorizontal: theme.spacing.xl,
  },
  manageTopicsText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: "700",
  },
});
