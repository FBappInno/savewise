import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type {
  Discovery,
} from "@savewise/shared";

import { KnowledgeUniverse } from "@/components/universe/knowledge-universe";
import { useKnowledgeLibrary } from "@/hooks/use-knowledge-library";
import { useAppSettings } from "@/providers/app-settings-provider";
import { trackAnonymousEvent } from "@/services/anonymous-analytics";
import { universeTheme } from "@/theme/universe-theme";

export default function LibraryScreen() {
  const { settings } =
    useAppSettings();

  const {
    library,
    isLoading,
    isRefreshing,
    error,
    refresh,
  } = useKnowledgeLibrary();

  useEffect(() => {
    void trackAnonymousEvent(
      "LibraryOpened",
      {
        operation: "library",
      },
    );
  }, []);

  function openDiscovery(
    discovery: Discovery,
  ) {
    router.push({
      pathname: "/discovery/[id]",
      params: {
        id: discovery.id,
      },
    });
  }

  const graph =
    library?.graph ?? null;

  return (
    <ScrollView
      contentContainerStyle={
        styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          tintColor={
            universeTheme.colors
              .primaryBright
          }
          onRefresh={() => {
            void refresh();
          }}
        />
      }
      showsVerticalScrollIndicator={
        false
      }
      style={styles.screen}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            DEIN ZWEITES GEHIRN
          </Text>

          <Text style={styles.title}>
            Wissensuniversum
          </Text>

          <Text style={styles.subtitle}>
            Entdecke Themen,
            Verbindungen und wachsende
            Wissensgebiete.
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            color={
              universeTheme.colors
                .primaryBright
            }
            name="planet-outline"
            size={24}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            color={
              universeTheme.colors
                .primaryBright
            }
            size="large"
          />

          <Text
            style={styles.loadingText}
          >
            SaveWise ordnet dein
            Wissensuniversum …
          </Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <MessageCard
          message={error}
          title="Universum nicht erreichbar"
        />
      ) : null}

      {!settings.ai.knowledgeGraph ? (
        <MessageCard
          message="Aktiviere den KI-Wissensgraphen in den Einstellungen, damit SaveWise dein Universum aufbauen kann."
          title="Wissensgraph deaktiviert"
        />
      ) : null}

      {!isLoading &&
      library &&
      !error &&
      !graph &&
      settings.ai.knowledgeGraph ? (
        <MessageCard
          message="Ziehe die Ansicht nach unten, damit SaveWise deinen Wissensgraphen neu lädt."
          title="Noch kein Universum vorhanden"
        />
      ) : null}

      {!isLoading &&
      library &&
      !error &&
      graph &&
      settings.ai.knowledgeGraph ? (
        <KnowledgeUniverse
          discoveries={
            library.discoveries
          }
          graph={graph}
          onOpenDiscovery={
            openDiscovery
          }
        />
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
      <View style={styles.messageIcon}>
        <Ionicons
          color={
            universeTheme.colors
              .primaryBright
          }
          name="sparkles-outline"
          size={22}
        />
      </View>

      <View style={styles.flex}>
        <Text style={styles.messageTitle}>
          {title}
        </Text>

        <Text style={styles.messageText}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor:
      universeTheme.colors.background,
  },

  content: {
    backgroundColor:
      universeTheme.colors.background,
    flexGrow: 1,
    paddingBottom: 110,
  },

  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 58,
  },

  eyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
  },

  title: {
    color:
      universeTheme.colors.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    marginTop: 5,
  },

  subtitle: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 280,
  },

  headerIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.09)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },

  centered: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 100,
  },

  loadingText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 16,
    textAlign: "center",
  },

  messageCard: {
    alignItems: "flex-start",
    backgroundColor:
      universeTheme.colors.surface,
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    marginHorizontal: 18,
    marginTop: 30,
    padding: 18,
  },

  messageIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.1)",
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  flex: {
    flex: 1,
  },

  messageTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 16,
    fontWeight: "800",
  },

  messageText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
});