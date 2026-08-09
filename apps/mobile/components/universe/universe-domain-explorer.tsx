import { Ionicons } from "@expo/vector-icons";

import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  universeTheme,
} from "@/theme/universe-theme";

export type UniverseExplorerDiscovery = {
  id: string;
  title: string;
  summary?: string | null;
  url?: string | null;
};

export type UniverseExplorerSubtopic = {
  id: string;
  label: string;
  discoveries: UniverseExplorerDiscovery[];
};

export type UniverseExplorerTopic = {
  id: string;
  label: string;
  subtopics: UniverseExplorerSubtopic[];
  discoveries: UniverseExplorerDiscovery[];
};

export type UniverseExplorerDomain = {
  id: string;
  label: string;
  topics: UniverseExplorerTopic[];
  discoveries: UniverseExplorerDiscovery[];
};

type UniverseDomainExplorerProps = {
  domain: UniverseExplorerDomain | null;
  visible: boolean;
  onClose: () => void;
  onOpenDiscovery: (
    discoveryId: string,
  ) => void;
};

export function UniverseDomainExplorer({
  domain,
  visible,
  onClose,
  onOpenDiscovery,
}: UniverseDomainExplorerProps) {
  if (!domain) {
    return null;
  }

  const discoveryCount =
    countDomainDiscoveries(
      domain,
    );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerIdentity}>
            <View style={styles.headerIcon}>
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="planet-outline"
                size={21}
              />
            </View>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>
                WISSENSDOMÄNE
              </Text>

              <Text
                numberOfLines={1}
                style={styles.title}
              >
                {domain.label}
              </Text>

              <Text style={styles.subtitle}>
                {domain.topics.length} Topics ·{" "}
                {discoveryCount} Discoveries
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityLabel="Schliessen"
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
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
        </View>

        <ScrollView
          contentContainerStyle={
            styles.content
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {domain.topics.length ===
          0 ? (
            <EmptyState />
          ) : (
            domain.topics.map(
              (topic) => (
                <TopicSection
                  key={topic.id}
                  onOpenDiscovery={
                    onOpenDiscovery
                  }
                  topic={topic}
                />
              ),
            )
          )}

          {domain.discoveries.length >
          0 ? (
            <DiscoveryGroup
              discoveries={
                domain.discoveries
              }
              label="Direkt in dieser Galaxie"
              onOpenDiscovery={
                onOpenDiscovery
              }
            />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function TopicSection({
  topic,
  onOpenDiscovery,
}: {
  topic: UniverseExplorerTopic;
  onOpenDiscovery: (
    discoveryId: string,
  ) => void;
}) {
  const discoveryCount =
    topic.discoveries.length +
    topic.subtopics.reduce(
      (
        total,
        subtopic,
      ) =>
        total +
        subtopic.discoveries.length,
      0,
    );

  return (
    <View style={styles.topicCard}>
      <View style={styles.topicHeader}>
        <View style={styles.topicIcon}>
          <Ionicons
            color={
              universeTheme.colors
                .violet
            }
            name="git-network-outline"
            size={18}
          />
        </View>

        <View style={styles.topicIdentity}>
          <Text style={styles.topicLabel}>
            TOPIC
          </Text>

          <Text style={styles.topicTitle}>
            {topic.label}
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {discoveryCount}
          </Text>
        </View>
      </View>

      {topic.subtopics.map(
        (subtopic) => (
          <SubtopicSection
            key={subtopic.id}
            onOpenDiscovery={
              onOpenDiscovery
            }
            subtopic={subtopic}
          />
        ),
      )}

      {topic.discoveries.length >
      0 ? (
        <DiscoveryGroup
          discoveries={
            topic.discoveries
          }
          label="Weitere Discoveries"
          onOpenDiscovery={
            onOpenDiscovery
          }
        />
      ) : null}
    </View>
  );
}

function SubtopicSection({
  subtopic,
  onOpenDiscovery,
}: {
  subtopic: UniverseExplorerSubtopic;
  onOpenDiscovery: (
    discoveryId: string,
  ) => void;
}) {
  return (
    <View style={styles.subtopicSection}>
      <View style={styles.subtopicHeader}>
        <View style={styles.subtopicDot} />

        <Text style={styles.subtopicTitle}>
          {subtopic.label}
        </Text>

        <Text style={styles.subtopicCount}>
          {subtopic.discoveries.length}
        </Text>
      </View>

      {subtopic.discoveries.map(
        (discovery) => (
          <DiscoveryRow
            discovery={discovery}
            key={discovery.id}
            onPress={() => {
              onOpenDiscovery(
                discovery.id,
              );
            }}
          />
        ),
      )}
    </View>
  );
}

function DiscoveryGroup({
  label,
  discoveries,
  onOpenDiscovery,
}: {
  label: string;
  discoveries: UniverseExplorerDiscovery[];
  onOpenDiscovery: (
    discoveryId: string,
  ) => void;
}) {
  return (
    <View style={styles.discoveryGroup}>
      <Text
        style={
          styles.discoveryGroupLabel
        }
      >
        {label}
      </Text>

      {discoveries.map(
        (discovery) => (
          <DiscoveryRow
            discovery={discovery}
            key={discovery.id}
            onPress={() => {
              onOpenDiscovery(
                discovery.id,
              );
            }}
          />
        ),
      )}
    </View>
  );
}

function DiscoveryRow({
  discovery,
  onPress,
}: {
  discovery: UniverseExplorerDiscovery;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.discoveryRow,
        pressed &&
          styles.pressed,
      ]}
    >
      <View style={styles.discoveryIcon}>
        <Ionicons
          color={
            universeTheme.colors
              .primaryBright
          }
          name="document-text-outline"
          size={17}
        />
      </View>

      <View style={styles.discoveryText}>
        <Text
          numberOfLines={2}
          style={styles.discoveryTitle}
        >
          {discovery.title}
        </Text>

        {discovery.summary ? (
          <Text
            numberOfLines={2}
            style={
              styles.discoverySummary
            }
          >
            {discovery.summary}
          </Text>
        ) : null}
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
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Ionicons
        color={
          universeTheme.colors
            .textMuted
        }
        name="planet-outline"
        size={32}
      />

      <Text style={styles.emptyTitle}>
        Noch keine Topics
      </Text>

      <Text style={styles.emptyDescription}>
        Diese Galaxie besitzt aktuell noch
        keine untergeordneten Topics.
      </Text>
    </View>
  );
}

function countDomainDiscoveries(
  domain: UniverseExplorerDomain,
): number {
  const discoveryIds =
    new Set<string>();

  domain.discoveries.forEach(
    (discovery) => {
      discoveryIds.add(
        discovery.id,
      );
    },
  );

  domain.topics.forEach(
    (topic) => {
      topic.discoveries.forEach(
        (discovery) => {
          discoveryIds.add(
            discovery.id,
          );
        },
      );

      topic.subtopics.forEach(
        (subtopic) => {
          subtopic.discoveries.forEach(
            (discovery) => {
              discoveryIds.add(
                discovery.id,
              );
            },
          );
        },
      );
    },
  );

  return discoveryIds.size;
}

const styles =
  StyleSheet.create({
    screen: {
      backgroundColor:
        universeTheme.colors
          .background,
      flex: 1,
    },

    header: {
      alignItems: "center",
      backgroundColor:
        universeTheme.colors
          .backgroundElevated,
      borderBottomColor:
        universeTheme.colors.border,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: "row",
      justifyContent:
        "space-between",
      paddingBottom: 14,
      paddingHorizontal: 17,
      paddingTop: 18,
    },

    headerIdentity: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 11,
    },

    headerIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.11)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 12,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },

    headerText: {
      flex: 1,
    },

    eyebrow: {
      color:
        universeTheme.colors.primary,
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 1,
    },

    title: {
      color:
        universeTheme.colors.text,
      fontSize: 19,
      fontWeight: "900",
      marginTop: 2,
    },

    subtitle: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 8,
      marginTop: 3,
    },

    closeButton: {
      alignItems: "center",
      backgroundColor:
        "rgba(148, 163, 184, 0.07)",
      borderColor:
        universeTheme.colors.border,
      borderRadius: 999,
      borderWidth: 1,
      height: 38,
      justifyContent: "center",
      width: 38,
    },

    content: {
      gap: 13,
      padding: 16,
      paddingBottom: 42,
    },

    topicCard: {
      backgroundColor:
        "rgba(6, 20, 36, 0.90)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 18,
      borderWidth: 1,
      overflow: "hidden",
      padding: 13,
    },

    topicHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      marginBottom: 10,
    },

    topicIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(139, 92, 246, 0.10)",
      borderRadius: 10,
      height: 35,
      justifyContent: "center",
      width: 35,
    },

    topicIdentity: {
      flex: 1,
    },

    topicLabel: {
      color:
        universeTheme.colors.violet,
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.8,
    },

    topicTitle: {
      color:
        universeTheme.colors.text,
      fontSize: 14,
      fontWeight: "900",
      marginTop: 2,
    },

    countBadge: {
      alignItems: "center",
      backgroundColor:
        "rgba(148, 163, 184, 0.08)",
      borderRadius: 999,
      justifyContent: "center",
      minWidth: 29,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    countText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      fontWeight: "900",
    },

    subtopicSection: {
      borderTopColor:
        universeTheme.colors.border,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      paddingTop: 10,
    },

    subtopicHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 7,
      marginBottom: 7,
    },

    subtopicDot: {
      backgroundColor:
        universeTheme.colors
          .primaryBright,
      borderRadius: 999,
      height: 6,
      width: 6,
    },

    subtopicTitle: {
      color:
        universeTheme.colors
          .textSecondary,
      flex: 1,
      fontSize: 10,
      fontWeight: "900",
    },

    subtopicCount: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 8,
      fontWeight: "800",
    },

    discoveryGroup: {
      borderTopColor:
        universeTheme.colors.border,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      marginTop: 8,
      paddingTop: 10,
    },

    discoveryGroupLabel: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 0.7,
      marginBottom: 6,
      textTransform: "uppercase",
    },

    discoveryRow: {
      alignItems: "center",
      borderRadius: 12,
      flexDirection: "row",
      gap: 9,
      minHeight: 54,
      paddingHorizontal: 7,
      paddingVertical: 7,
    },

    discoveryIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.08)",
      borderRadius: 9,
      height: 34,
      justifyContent: "center",
      width: 34,
    },

    discoveryText: {
      flex: 1,
    },

    discoveryTitle: {
      color:
        universeTheme.colors.text,
      fontSize: 10,
      fontWeight: "800",
      lineHeight: 14,
    },

    discoverySummary: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 8,
      lineHeight: 12,
      marginTop: 3,
    },

    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 260,
      paddingHorizontal: 30,
    },

    emptyTitle: {
      color:
        universeTheme.colors.text,
      fontSize: 16,
      fontWeight: "900",
      marginTop: 13,
    },

    emptyDescription: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 10,
      lineHeight: 16,
      marginTop: 7,
      textAlign: "center",
    },

    pressed: {
      opacity: 0.65,
    },
  });
