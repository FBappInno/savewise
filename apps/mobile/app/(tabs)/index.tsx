import { router } from "expo-router";
import {
  useMemo,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CaptureModal } from "@/components/capture-modal";
import { DiscoveryCard } from "@/components/discovery-card";
import { SaveWiseButton } from "@/components/savewise-button";
import { SearchBar } from "@/components/search-bar";
import { useDiscoveries } from "@/hooks/use-discoveries";
import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";
import type { CapturedItem } from "@/types/captured-item";
import type { Discovery } from "@/types/discovery";
import { trackAnonymousEvent } from "@/services/anonymous-analytics";

export default function HomeScreen() {
  const { t } = useAppSettings();
  const [
    isCaptureModalVisible,
    setCaptureModalVisible,
  ] = useState(false);

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    if (search.trim().length < 2) return;
    const timeout = setTimeout(() => {
      void trackAnonymousEvent("SearchUsed", { operation: "search" });
    }, 700);
    return () => clearTimeout(timeout);
  }, [search]);

  const {
    discoveries,
    isLoading,
    isRefreshing,
    isImporting,
    error,
    refresh,
    importDiscovery,
  } = useDiscoveries();

  const filteredDiscoveries =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase();

      if (!normalizedSearch) {
        return discoveries;
      }

      return discoveries.filter(
        (discovery) => {
          const searchableValues = [
            discovery.title,
            discovery.improvedTitle,
            discovery.summary,
            discovery.description,
            discovery.author,
            discovery.classification
              ?.primaryCategory,
            discovery.classification
              ?.secondaryCategory,
            discovery.classification
              ?.topic,
            ...discovery.topics,
            ...discovery.keywords,
          ];

          return searchableValues.some(
            (value) =>
              typeof value ===
                "string" &&
              value
                .toLocaleLowerCase()
                .includes(
                  normalizedSearch,
                ),
          );
        },
      );
    }, [
      discoveries,
      search,
    ]);

  function handleDiscoveryPress(
    discovery: Discovery,
  ) {
    router.push({
      pathname: "/discovery/[id]",
      params: {
        id: discovery.id,
      },
    });
  }

  async function handleSaveCapture(
    capturedItem: CapturedItem,
  ) {
    try {
      await importDiscovery(
        capturedItem.url,
        capturedItem.preferredKnowledgePath,
      );

      setCaptureModalVisible(
        false,
      );
    } catch (importError) {
      Alert.alert(
        t("home.importFailed"),
        importError instanceof Error
          ? importError.message
          : "The content could not be imported.",
      );
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void refresh();
            }}
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <Text style={styles.logo}>
            SaveWise
          </Text>

          <Text style={styles.subtitle}>
            {t("home.subtitle")}
          </Text>
        </View>

        <SearchBar
          placeholder={t("home.search")}
          value={search}
          onChangeText={setSearch}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text
              style={styles.errorText}
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View
            style={styles.sectionHeader}
          >
            <Text
              style={styles.sectionTitle}
            >
              {t("home.discoveries")}
            </Text>

            <Text
              style={
                styles.discoveryCount
              }
            >
              {
                filteredDiscoveries.length
              }
            </Text>
          </View>

          {isLoading ? (
            <View
              style={
                styles.loadingContainer
              }
            >
              <ActivityIndicator />

              <Text
                style={styles.loadingText}
              >
                {t("home.loading")}
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          filteredDiscoveries.length ===
            0 ? (
            <View
              style={styles.emptyState}
            >
              <Text
                style={styles.emptyTitle}
              >
                {t("home.emptyTitle")}
              </Text>

              <Text
                style={styles.emptyText}
              >
                {t("home.emptyText")}
              </Text>
            </View>
          ) : null}

          <View
            style={styles.discoveryList}
          >
            {filteredDiscoveries.map(
              (discovery) => (
                <DiscoveryCard
                  key={discovery.id}
                  discovery={
                    discovery
                  }
                  onPress={
                    handleDiscoveryPress
                  }
                />
              ),
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <SaveWiseButton
          disabled={isImporting}
          label={
            isImporting
              ? t("home.analyzing")
              : t("home.capture")
          }
          onPress={() => {
            setCaptureModalVisible(
              true,
            );
          }}
        />
      </View>

      <CaptureModal
        existingKnowledgePaths={buildKnowledgePaths(discoveries)}
        visible={
          isCaptureModalVisible
        }
        onClose={() => {
          if (!isImporting) {
            setCaptureModalVisible(
              false,
            );
          }
        }}
        onSave={handleSaveCapture}
      />
    </View>
  );
}

function buildKnowledgePaths(discoveries: Discovery[]): string[][] {
  const paths = discoveries.flatMap((discovery) => {
    const classification = discovery.classification;
    if (!classification) return [];
    return [[
      classification.secondaryCategory,
      classification.topic,
    ].filter(Boolean)];
  });

  const unique = new Map(paths.map((path) => [path.join(" › ").toLocaleLowerCase(), path]));
  return [...unique.values()].sort((left, right) => left.join(" › ").localeCompare(right.join(" › ")));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      theme.colors.background,
  },

  scrollContent: {
    paddingHorizontal:
      theme.spacing.xl,
    paddingTop:
      theme.spacing.xxxl + theme.spacing.sm,
    paddingBottom: 120,
  },

  header: {
    alignItems: "center",
    marginBottom:
      theme.spacing.xxl,
  },

  logo: {
    ...theme.typography.screenTitle,
    color:
      theme.colors.text,
  },

  subtitle: {
    ...theme.typography.body,
    color:
      theme.colors.textSecondary,
    marginTop:
      theme.spacing.sm,
    textAlign: "center",
  },

  errorBox: {
    backgroundColor:
      theme.colors.surface,
    borderColor:
      theme.colors.border,
    borderRadius:
      theme.radius.md,
    borderWidth: 1,
    marginTop:
      theme.spacing.lg,
    padding:
      theme.spacing.md,
  },

  errorText: {
    ...theme.typography.body,
    color:
      theme.colors.textSecondary,
  },

  section: {
    marginTop:
      theme.spacing.xxl,
  },

  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginBottom:
      theme.spacing.lg,
  },

  sectionTitle: {
    ...theme.typography.sectionTitle,
    color:
      theme.colors.text,
  },

  discoveryCount: {
    ...theme.typography.caption,
    color:
      theme.colors.textSecondary,
  },

  discoveryList: {
    gap:
      theme.spacing.lg,
  },

  loadingContainer: {
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

  emptyState: {
    alignItems: "center",
    paddingHorizontal:
      theme.spacing.xl,
    paddingVertical:
      theme.spacing.xxxl,
  },

  emptyTitle: {
    ...theme.typography.sectionTitle,
    color:
      theme.colors.text,
    textAlign: "center",
  },

  emptyText: {
    ...theme.typography.body,
    color:
      theme.colors.textSecondary,
    marginTop:
      theme.spacing.sm,
    textAlign: "center",
  },

  footer: {
    bottom:
      theme.spacing.xl,
    left:
      theme.spacing.xl,
    position: "absolute",
    right:
      theme.spacing.xl,
  },
});
