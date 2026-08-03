import { router } from "expo-router";
import {
  useMemo,
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
import { theme } from "@/theme";
import type { CapturedItem } from "@/types/captured-item";
import type { Discovery } from "@/types/discovery";

export default function HomeScreen() {
  const [
    isCaptureModalVisible,
    setCaptureModalVisible,
  ] = useState(false);

  const [search, setSearch] =
    useState("");

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
      );

      setCaptureModalVisible(
        false,
      );
    } catch (importError) {
      Alert.alert(
        "Import failed",
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
            Your personal knowledge
            assistant
          </Text>
        </View>

        <SearchBar
          placeholder="Search your discoveries..."
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
              Discoveries
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
                Loading discoveries...
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
                No discoveries yet
              </Text>

              <Text
                style={styles.emptyText}
              >
                Capture your first URL
                to start building your
                personal knowledge
                library.
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
              ? "Analyzing..."
              : "+ Capture"
          }
          onPress={() => {
            setCaptureModalVisible(
              true,
            );
          }}
        />
      </View>

      <CaptureModal
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
      theme.spacing.xxxl,
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