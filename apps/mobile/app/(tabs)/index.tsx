import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type {
  Discovery,
} from "@savewise/shared";

import { CaptureModal } from "@/components/capture-modal";
import { KnowledgeUniverse } from "@/components/universe/knowledge-universe";
import { useDiscoveries } from "@/hooks/use-discoveries";
import { useKnowledgeLibrary } from "@/hooks/use-knowledge-library";
import { useAppSettings } from "@/providers/app-settings-provider";
import { universeTheme } from "@/theme/universe-theme";

import {
  filterDiscoveriesByWorkspace,
} from "@/utils/workspace";
import { UniverseSearch } from "@/components/universe/universe-search";

import type {
  CapturedItem,
} from "@/types/captured-item";

export default function UniverseHomeScreen() {
  const {
    settings,
    t,
  } = useAppSettings();

  const [
    isCaptureModalVisible,
    setCaptureModalVisible,
  ] = useState(false);

  const [
    isUpdating,
    setUpdating,
  ] = useState(false);

  const {
    discoveries,
    isImporting,
    importDiscovery,
    refresh:
      refreshDiscoveries,
  } = useDiscoveries();

  const {
    library,
    isLoading,
    isRefreshing,
    error,
    refresh:
      refreshLibrary,
  } = useKnowledgeLibrary();

  const graph =
    library?.graph ?? null;

  const allUniverseDiscoveries =
    library?.discoveries ??
    discoveries;

  const universeDiscoveries =
    useMemo(
      () =>
        filterDiscoveriesByWorkspace(
          allUniverseDiscoveries,
          settings.workspace.activeId,
        ),
      [
        allUniverseDiscoveries,
        settings.workspace.activeId,
      ],
    );

  const existingMainTopics =
    useMemo(
      () =>
        buildExistingDomains(
          universeDiscoveries,
        ),
      [universeDiscoveries],
    );

  const domainCount =
    existingMainTopics.length;

  const {
    width: screenWidth,
  } = useWindowDimensions();

  const HORIZONTAL_PADDING = 18;
  const GRID_GAP = 8;

  const availableRowWidth =
    screenWidth -
    HORIZONTAL_PADDING * 2;

  const metricCardWidth =
    (
      availableRowWidth -
      GRID_GAP * 2
    ) / 3;

  /*
   * Exakt:
   * obere Karte 1
   * + Zwischenraum
   * + obere Karte 2
   */
  const searchRowSearchWidth =
    metricCardWidth * 2 +
    GRID_GAP;

  /*
   * Exakt so breit wie
   * das obere KI-Feld.
   */
  const searchRowActionsWidth =
    metricCardWidth;

  function openDiscovery(
    discovery: Discovery,
  ) {
    router.push({
      pathname:
        "/discovery/[id]",

      params: {
        id:
          discovery.id,
      },
    });
  }

  async function handleSaveCapture(
    capturedItem:
      CapturedItem,
  ) {
    try {
      await importDiscovery(
        capturedItem.url,
        capturedItem
          .preferredKnowledgePath,
        settings.workspace.activeId,
      );

      setCaptureModalVisible(
        false,
      );

      await Promise.all([
        refreshDiscoveries(),
        refreshLibrary(),
      ]);
    } catch (importError) {
      Alert.alert(
        t(
          "home.importFailed",
        ),

        importError instanceof Error
          ? importError.message
          : "Die Discovery konnte nicht importiert werden.",
      );
    }
  }

  async function handleFileImported() {
    await Promise.all([
      refreshDiscoveries(),
      refreshLibrary(),
    ]);
  }

  async function handleRefresh() {
    if (isUpdating) {
      return;
    }

    setUpdating(true);

    try {
      await Promise.all([
        refreshDiscoveries(),
        refreshLibrary(),
      ]);
    } catch (refreshError) {
      Alert.alert(
        "Aktualisierung fehlgeschlagen",

        refreshError instanceof Error
          ? refreshError.message
          : "Das Universum konnte nicht aktualisiert werden.",
      );
    } finally {
      setUpdating(false);
    }
  }


  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void handleRefresh();
            }}
            refreshing={
              isRefreshing ||
              isUpdating
            }
            tintColor={
              universeTheme.colors
                .primaryBright
            }
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.metrics}>
          <MetricCard
            icon="planet-outline"
            label="Galaxien"
            value={domainCount}
          />

<MetricCard
            icon="documents-outline"
            label="Discoveries"
            value={
              universeDiscoveries.length
            }
          />


          

          <MetricCard
            active={
              settings.ai
                .knowledgeGraph
            }
            icon="sparkles-outline"
            label="KI"
            value={
              settings.ai
                .knowledgeGraph
                ? "Aktiv"
                : "Aus"
            }
          />
        </View>

        <View style={styles.searchActionRow}>
          <View
            style={[
              styles.searchArea,
              {
                width:
                  searchRowSearchWidth,
              },
            ]}
          >
            <UniverseSearch
              discoveries={
                universeDiscoveries
              }
              onOpenDiscovery={
                openDiscovery
              }
            />
          </View>

          <View
            style={[
              styles.searchActions,
              {
                width:
                  searchRowActionsWidth,
              },
            ]}
          >
            <Pressable
            accessibilityLabel="Daten neu laden"
            accessibilityRole="button"
            disabled={isUpdating}
            onPress={() => {
            void handleRefresh();
            }}
            style={({ pressed }) => [
            styles.actionButton,

            pressed &&
            styles.pressed,

            isUpdating &&
            styles.disabled,
            ]}
            >
            {isUpdating ? (
            <ActivityIndicator
            color={
            universeTheme.colors
            .primaryBright
            }
            size="small"
            />
            ) : (
            <Ionicons
            color={
            universeTheme.colors
            .primaryBright
            }
            name="refresh-outline"
            size={20}
            />
            )}
            </Pressable>

            <Pressable
            accessibilityLabel="Neue Discovery"
            accessibilityRole="button"
            disabled={isImporting}
            onPress={() => {
            setCaptureModalVisible(
            true,
            );
            }}
            style={({ pressed }) => [
            styles.addButton,

            pressed &&
            styles.pressed,

            isImporting &&
            styles.disabled,
            ]}
            >
            {isImporting ? (
            <ActivityIndicator
            color="#03111E"
            size="small"
            />
            ) : (
            <Ionicons
            color="#03111E"
            name="add"
            size={23}
            />
            )}
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.messageCard}>
            <Ionicons
              color={
                universeTheme.colors
                  .danger
              }
              name="alert-circle-outline"
              size={22}
            />

            <View style={styles.flex}>
              <Text
                style={
                  styles.messageTitle
                }
              >
                Universum nicht erreichbar
              </Text>

              <Text
                style={
                  styles.messageText
                }
              >
                {error}
              </Text>
            </View>
          </View>
        ) : null}

        {isLoading &&
        !graph ? (
          <View style={styles.loading}>
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
              SaveWise lädt dein
              Wissensuniversum …
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        !settings.ai
          .knowledgeGraph ? (
          <View style={styles.messageCard}>
            <Ionicons
              color={
                universeTheme.colors
                  .primary
              }
              name="sparkles-outline"
              size={22}
            />

            <View style={styles.flex}>
              <Text
                style={
                  styles.messageTitle
                }
              >
                Wissensgraph deaktiviert
              </Text>

              <Text
                style={
                  styles.messageText
                }
              >
                Aktiviere den
                KI-Wissensgraphen in
                den Einstellungen.
              </Text>
            </View>
          </View>
        ) : null}

        {!isLoading &&
        settings.ai
          .knowledgeGraph &&
        graph ? (
          <KnowledgeUniverse
            discoveries={
              universeDiscoveries
            }
            graph={graph}
            onOpenDiscovery={
              openDiscovery
            }
            workspaceId={
              settings.workspace.activeId ===
              "business"
                ? "business"
                : "private"
            }
          />
        ) : null}

        {!isLoading &&
        settings.ai
          .knowledgeGraph &&
        !graph &&
        !error ? (
          <View style={styles.messageCard}>
            <Ionicons
              color={
                universeTheme.colors
                  .primaryBright
              }
              name="planet-outline"
              size={22}
            />

            <View style={styles.flex}>
              <Text
                style={
                  styles.messageTitle
                }
              >
                Noch kein Universum
              </Text>

              <Text
                style={
                  styles.messageText
                }
              >
                Tippe oben rechts auf
                Aktualisieren, um das
                Wissensuniversum neu zu laden.
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <CaptureModal
        onFileImported={
          handleFileImported
        }
        existingMainTopics={
          existingMainTopics
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
        visible={
          isCaptureModalVisible
        }
      />
    </View>
  );
}

function MetricCard({
  active = false,
  icon,
  label,
  value,
}: {
  active?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number | string;
}) {
  return (
    <View
      style={[
        styles.metricCard,
        active &&
          styles.metricCardActive,
      ]}
    >
      <View
        style={[
          styles.metricIcon,
          active &&
            styles.metricIconActive,
        ]}
      >
        <Ionicons
          color={
            active
              ? "#22C55E"
              : universeTheme.colors.primaryBright
          }
          name={icon}
          size={18}
        />
      </View>

      <View
        style={
          styles.metricCardTextBlock
        }
      >
        <Text
          numberOfLines={1}
          style={
            styles.metricValue
          }
        >
          {value}
        </Text>

        <Text
          numberOfLines={1}
          style={
            styles.metricLabel
          }
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function buildExistingDomains(
  discoveries: Discovery[],
): string[] {
  const domains =
    new Map<string, string>();

  discoveries.forEach(
    (discovery) => {
      const value =
        discovery.classification
          ?.secondaryCategory
          ?.replace(
            /\s+/g,
            " ",
          )
          .trim();

      if (
        !value ||
        isGenericDomain(value)
      ) {
        return;
      }

      const key =
        value.toLocaleLowerCase();

      if (!domains.has(key)) {
        domains.set(
          key,
          value,
        );
      }
    },
  );

  return [
    ...domains.values(),
  ].sort(
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

function isGenericDomain(
  value: string,
): boolean {
  const normalized =
    value
      .trim()
      .toLocaleLowerCase()
      .replace(
        /[\s_-]+/g,
        " ",
      );

  return [
    "other",
    "others",
    "general",
    "miscellaneous",
    "misc",
    "unknown",
    "uncategorized",
    "unclassified",
    "sonstiges",
    "andere",
    "allgemein",
    "noch nicht eingeordnet",
    "nicht eingeordnet",
  ].includes(normalized);
}

const styles =
  StyleSheet.create({
    screen: {
      backgroundColor:
        universeTheme.colors
          .background,
      flex: 1,
    },

    content: {
      backgroundColor:
        universeTheme.colors
          .background,
      flexGrow: 1,
      paddingBottom: 110,
    },

    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent:
        "space-between",
      paddingBottom: 14,
      paddingHorizontal: 18,
      paddingTop: 56,
    },

    brand: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: 11,
    },

    brandIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.12)",
      borderColor:
        universeTheme.colors
          .primaryBright,
      borderRadius: 999,
      borderWidth: 1.5,
      height: 43,
      justifyContent: "center",
      width: 43,
    },

    brandIconText: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 22,
      fontWeight: "900",
    },

    flex: {
      flex: 1,
    },

    eyebrow: {
      color:
        universeTheme.colors
          .primary,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    title: {
      color:
        universeTheme.colors
          .text,
      fontSize: 21,
      fontWeight: "900",
      marginTop: 3,
    },

    headerActions: {
      flexDirection: "row",
      gap: 9,
    },

    actionButton: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.10)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 14,
      borderWidth: 1,
      flex: 1,
      height: 46,
      justifyContent: "center",
      minWidth: 0,
    },

    addButton: {
      alignItems: "center",
      backgroundColor:
        universeTheme.colors
          .primaryBright,
      borderRadius: 14,
      flex: 1,
      height: 46,
      justifyContent: "center",
      minWidth: 0,
      shadowColor:
        universeTheme.colors
          .primaryBright,
      shadowOpacity: 0.30,
      shadowRadius: 9,
    },

    metrics: {
      flexDirection: "row",
      gap: 8,
      paddingBottom: 0,
      paddingHorizontal: 18,
    },

    metricCard: {
      alignItems: "center",
      backgroundColor:
        "rgba(3, 12, 24, 0.72)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 15,
      borderWidth: 1,
      flex: 1,
      flexDirection: "row",
      gap: 8,
      height: 56,
      paddingHorizontal: 10,
    },

    metricCardActive: {
      borderColor:
        "rgba(34, 197, 94, 0.72)",
      shadowColor:
        "#22C55E",
      shadowOpacity: 0.14,
      shadowRadius: 8,
    },

    metricIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.09)",
      borderRadius: 999,
      height: 30,
      justifyContent: "center",
      width: 30,
    },

    metricIconActive: {
      backgroundColor:
        "rgba(74, 222, 128, 0.10)",
    },

    metricCardTextBlock: {
      alignItems: "flex-start",
      flex: 1,
      justifyContent: "center",
      minWidth: 0,
    },

    metricValue: {
      color:
        universeTheme.colors
          .text,
      fontSize: 17,
      fontWeight: "900",
      lineHeight: 19,
    },

    metricValueActive: {
      color:
        universeTheme.colors
          .text,
    },

    metricLabel: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      fontWeight: "600",
      lineHeight: 11,
      marginTop: 1,
    },

    searchActionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
      marginBottom: 22,
      marginHorizontal: 18,
      marginTop: 8,
    },

    searchArea: {
      flexGrow: 0,
      flexShrink: 0,
      minWidth: 0,
    },

    searchActions: {
      alignItems: "stretch",
      flexDirection: "row",
      flexGrow: 0,
      flexShrink: 0,
      gap: 8,
      minWidth: 0,
    },

    refreshHint: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 20,
      paddingTop: 3,
    },

    refreshHintText: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 9,
      lineHeight: 13,
    },

    loading: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 100,
    },

    loadingText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 13,
      marginTop: 14,
      textAlign: "center",
    },

    messageCard: {
      alignItems: "flex-start",
      backgroundColor:
        universeTheme.colors
          .surface,
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 17,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      marginHorizontal: 18,
      marginTop: 18,
      padding: 15,
    },

    messageTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 14,
      fontWeight: "900",
    },

    messageText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },

    pressed: {
      opacity: 0.66,
    },

    disabled: {
      opacity: 0.45,
    },
  });
