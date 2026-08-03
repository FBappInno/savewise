import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { KnowledgeTree } from "@/components/library/knowledge-tree";
import { useKnowledgeLibrary } from "@/hooks/use-knowledge-library";
import { theme } from "@/theme";
import type { Discovery } from "@/types/discovery";

export default function LibraryScreen() {
  const {
    library,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useKnowledgeLibrary();

  const graph = library?.graph ?? null;

  function openDiscovery(
    discovery: Discovery,
  ) {
    router.push(
      `/discovery/${discovery.id}`,
    );
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
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.aiIcon}>
                <Ionicons
                  color={theme.colors.primary}
                  name="sparkles-outline"
                  size={19}
                />
              </View>

              <View style={styles.summaryMeta}>
                <Text style={styles.summaryLabel}>
                  PERSONAL KNOWLEDGE MAP
                </Text>

                <Text style={styles.summaryStats}>
                  {graph.rootNodeIds.length}{" "}
                  domains · {graph.nodes.length}{" "}
                  nodes · {library.discoveries.length}{" "}
                  discoveries
                </Text>
              </View>
            </View>

            <Text style={styles.summaryText}>
              {graph.summary}
            </Text>
          </View>

          <View style={styles.treeSection}>
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
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.lg,
  },
  summaryHeader: {
    alignItems: "center",
    flexDirection: "row",
  },
  aiIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    marginRight: theme.spacing.md,
    width: 38,
  },
  summaryMeta: {
    flex: 1,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  summaryStats: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  summaryText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
    marginTop: theme.spacing.md,
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
