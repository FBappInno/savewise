import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useEffect,
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
import { StarBackground } from "@/components/universe-ui/star-background";
import { useDiscoveries } from "@/hooks/use-discoveries";
import { useAppSettings } from "@/providers/app-settings-provider";
import { trackAnonymousEvent } from "@/services/anonymous-analytics";
import { universeTheme } from "@/theme/universe-theme";
import type { CapturedItem } from "@/types/captured-item";
import type { Discovery } from "@/types/discovery";

export default function HomeScreen() {
  const { t } = useAppSettings();

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

  useEffect(() => {
    if (
      search.trim().length < 2
    ) {
      return;
    }

    const timeout =
      setTimeout(() => {
        void trackAnonymousEvent(
          "SearchUsed",
          {
            operation: "search",
          },
        );
      }, 700);

    return () => {
      clearTimeout(timeout);
    };
  }, [search]);

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

  const mainTopics =
    useMemo(
      () =>
        buildMainTopics(
          discoveries,
        ),
      [discoveries],
    );

  function handleDiscoveryPress(
    discovery: Discovery,
  ) {
    router.push({
      pathname:
        "/discovery/[id]",
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
        capturedItem
          .preferredKnowledgePath,
      );

      setCaptureModalVisible(
        false,
      );
    } catch (importError) {
      Alert.alert(
        t("home.importFailed"),
        importError instanceof Error
          ? importError.message
          : "Der Inhalt konnte nicht importiert werden.",
      );
    }
  }

  return (
    <View style={styles.screen}>
      <StarBackground density={82} />

      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing
            }
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
      >
        <View style={styles.header}>
          <View
            style={styles.brandRow}
          >
            <View
              style={styles.logoMark}
            >
              <Text
                style={
                  styles.logoMarkText
                }
              >
                S
              </Text>
            </View>

            <View style={styles.flex}>
              <Text
                style={styles.eyebrow}
              >
                PERSONAL KNOWLEDGE OS
              </Text>

              <Text style={styles.logo}>
                SaveWise
              </Text>
            </View>

            <View
              style={
                styles.statusIndicator
              }
            >
              <View
                style={
                  styles.statusDot
                }
              />

              <Text
                style={
                  styles.statusText
                }
              >
                ONLINE
              </Text>
            </View>
          </View>

          <Text
            style={styles.subtitle}
          >
            Dein intelligenter Feed für
            neue Erkenntnisse,
            Zusammenhänge und Ideen.
          </Text>
        </View>

        <View
          style={styles.metricRow}
        >
          <Metric
            icon="documents-outline"
            label="Entdeckungen"
            value={
              discoveries.length
            }
          />

          <Metric
            icon="git-network-outline"
            label="Hauptthemen"
            value={
              mainTopics.length
            }
          />

          <Metric
            icon="sparkles-outline"
            label="KI"
            value="Aktiv"
          />
        </View>

        <SearchBar
          onChangeText={setSearch}
          onClear={() => {
            setSearch("");
          }}
          placeholder="Durchsuche dein Wissen …"
          value={search}
        />

        {error ? (
          <View
            style={styles.errorBox}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .danger
              }
              name="warning-outline"
              size={20}
            />

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                KNOWLEDGE FEED
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Entdeckungen
              </Text>
            </View>

            <View
              style={
                styles.countBadge
              }
            >
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
          </View>

          {isLoading ? (
            <View
              style={
                styles.loadingContainer
              }
            >
              <ActivityIndicator
                color={
                  universeTheme.colors
                    .primaryBright
                }
                size="large"
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                SaveWise synchronisiert
                dein Wissen …
              </Text>
            </View>
          ) : null}

          {!isLoading &&
          filteredDiscoveries.length ===
            0 ? (
            <View
              style={
                styles.emptyState
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .primaryBright
                  }
                  name="planet-outline"
                  size={32}
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Dein Universum wartet
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Speichere einen Link,
                damit SaveWise dein
                Wissen analysieren und
                verbinden kann.
              </Text>
            </View>
          ) : null}

          <View
            style={
              styles.discoveryList
            }
          >
            {filteredDiscoveries.map(
              (discovery) => (
                <DiscoveryCard
                  key={discovery.id}
                  discovery={discovery}
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
          icon="add"
          label={
            isImporting
              ? t(
                  "home.analyzing",
                )
              : "Neue Discovery"
          }
          loading={isImporting}
          onPress={() => {
            setCaptureModalVisible(
              true,
            );
          }}
        />
      </View>

      <CaptureModal
        existingMainTopics={
          mainTopics
        }
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
        onSave={
          handleSaveCapture
        }
      />
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons
        color={
          universeTheme.colors.primary
        }
        name={icon}
        size={17}
      />

      <Text
        style={styles.metricValue}
      >
        {value}
      </Text>

      <Text
        style={styles.metricLabel}
      >
        {label}
      </Text>
    </View>
  );
}

function buildMainTopics(
  discoveries: Discovery[],
): string[] {
  const topics =
    new Map<string, string>();

  discoveries.forEach(
    (discovery) => {
      const mainTopic =
        discovery.classification
          ?.secondaryCategory
          ?.replace(/\s+/g, " ")
          .trim();

      if (!mainTopic) {
        return;
      }

      const key =
        mainTopic.toLocaleLowerCase();

      if (!topics.has(key)) {
        topics.set(
          key,
          mainTopic,
        );
      }
    },
  );

  return [...topics.values()].sort(
    (first, second) =>
      first.localeCompare(
        second,
        undefined,
        {
          sensitivity: "base",
        },
      ),
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor:
      universeTheme.colors.background,
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 145,
    paddingHorizontal: 18,
    paddingTop: 58,
  },

  header: {
    marginBottom: 22,
  },

  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },

  flex: {
    flex: 1,
  },

  logoMark: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.1)",
    borderColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 16,
    borderWidth: 1.5,
    height: 50,
    justifyContent: "center",
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.55,
    shadowRadius: 15,
    width: 50,
  },

  logoMarkText: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 27,
    fontWeight: "900",
  },

  eyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  logo: {
    color:
      universeTheme.colors.text,
    fontSize: 29,
    fontWeight: "900",
    lineHeight: 35,
  },

  subtitle: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 13,
    maxWidth: 350,
  },

  statusIndicator: {
    alignItems: "center",
    backgroundColor:
      "rgba(74, 222, 128, 0.06)",
    borderColor:
      "rgba(74, 222, 128, 0.22)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusDot: {
    backgroundColor:
      universeTheme.colors.green,
    borderRadius: 999,
    height: 6,
    width: 6,
  },

  statusText: {
    color:
      universeTheme.colors.green,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  metricRow: {
    backgroundColor:
      "rgba(6, 20, 36, 0.72)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 17,
    paddingVertical: 14,
  },

  metric: {
    alignItems: "center",
    flex: 1,
  },

  metricValue: {
    color:
      universeTheme.colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },

  metricLabel: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 9,
    marginTop: 2,
  },

  errorBox: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(248, 113, 113, 0.07)",
    borderColor:
      "rgba(248, 113, 113, 0.28)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    padding: 14,
  },

  errorText: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  section: {
    marginTop: 30,
  },

  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent:
      "space-between",
    marginBottom: 16,
  },

  sectionEyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },

  sectionTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 3,
  },

  countBadge: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderColor:
      universeTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    minWidth: 34,
    paddingHorizontal: 10,
  },

  discoveryCount: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 12,
    fontWeight: "900",
  },

  discoveryList: {
    gap: 14,
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 70,
  },

  loadingText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 13,
    marginTop: 14,
  },

  emptyState: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.74)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 46,
  },

  emptyIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.09)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    marginBottom: 16,
    width: 68,
  },

  emptyTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },

  footer: {
    bottom: 102,
    left: 18,
    position: "absolute",
    right: 18,
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.32,
    shadowRadius: 18,
  },
});