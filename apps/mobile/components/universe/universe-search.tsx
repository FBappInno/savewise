import { Ionicons } from "@expo/vector-icons";

import {
  useMemo,
  useState,
} from "react";

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  Discovery,
} from "@/types/discovery";

import {
  getDiscoveryHierarchy,
} from "@/utils/knowledge-hierarchy";

import {
  searchDiscoveries,
} from "@/utils/intelligent-discovery-search";

import {
  universeTheme,
} from "@/theme/universe-theme";

type UniverseSearchProps = {
  discoveries: Discovery[];

  onOpenDiscovery: (
    discovery: Discovery,
  ) => void;
};

export function UniverseSearch({
  discoveries,
  onOpenDiscovery,
}: UniverseSearchProps) {
  const [
    visible,
    setVisible,
  ] = useState(false);

  const [
    query,
    setQuery,
  ] = useState("");

  const results =
    useMemo(
      () =>
        searchDiscoveries(
          discoveries,
          query,
          20,
        ),
      [
        discoveries,
        query,
      ],
    );

  const hasQuery =
    query.trim().length >= 2;

  function closeSearch() {
    setVisible(false);
    setQuery("");
  }

  function openDiscovery(
    discovery: Discovery,
  ) {
    closeSearch();
    onOpenDiscovery(discovery);
  }

  return (
    <>
      <View style={styles.wrapper}>
        <Pressable
          accessibilityLabel="Wissen durchsuchen"
          accessibilityRole="button"
          onPress={() => {
            setVisible(true);
          }}
          style={({ pressed }) => [
            styles.searchTrigger,

            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            color={
              universeTheme.colors
                .textMuted
            }
            name="search-outline"
            size={19}
          />

          <Text
            style={
              styles.searchPlaceholder
            }
          >
            Wissen intelligent durchsuchen …
          </Text>

          <View style={styles.aiBadge}>
            <Ionicons
              color={
                universeTheme.colors
                  .primaryBright
              }
              name="sparkles"
              size={12}
            />

            <Text
              style={
                styles.aiBadgeText
              }
            >
              KI
            </Text>
          </View>
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={
          closeSearch
        }
        presentationStyle="pageSheet"
        visible={visible}
      >
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView
            behavior={
              Platform.OS === "ios"
                ? "padding"
                : undefined
            }
            style={styles.screen}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text
                  style={
                    styles.eyebrow
                  }
                >
                  INTELLIGENTE SUCHE
                </Text>

                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  Wissen durchsuchen
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Suche schließen"
                accessibilityRole="button"
                onPress={
                  closeSearch
                }
                style={({
                  pressed,
                }) => [
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

            <View
              style={
                styles.searchBar
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="search-outline"
                size={20}
              />

              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                clearButtonMode="while-editing"
                onChangeText={
                  setQuery
                }
                placeholder="Titel, Domäne, Topic oder Unterthema …"
                placeholderTextColor={
                  universeTheme.colors
                    .textMuted
                }
                returnKeyType="search"
                selectionColor={
                  universeTheme.colors
                    .primaryBright
                }
                style={styles.input}
                value={query}
              />

              {query ? (
                <Pressable
                  accessibilityLabel="Suche löschen"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    setQuery("");
                  }}
                >
                  <Ionicons
                    color={
                      universeTheme.colors
                        .textMuted
                    }
                    name="close-circle"
                    size={20}
                  />
                </Pressable>
              ) : null}
            </View>

            <View
              style={
                styles.statusRow
              }
            >
              <View
                style={
                  styles.statusBadge
                }
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .violet
                  }
                  name="sparkles-outline"
                  size={14}
                />

                <Text
                  style={
                    styles.statusBadgeText
                  }
                >
                  Synonyme, Tippfehler und
                  Wissenspfade
                </Text>
              </View>

              {hasQuery ? (
                <Text
                  style={
                    styles.resultCount
                  }
                >
                  {results.length} Treffer
                </Text>
              ) : null}
            </View>

            <ScrollView
              contentContainerStyle={
                styles.resultsContent
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
            >
              {!hasQuery ? (
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
                      name="search-outline"
                      size={28}
                    />
                  </View>

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    Dein Wissen durchsuchen
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Suche nach einem Titel,
                    einer Domäne, einem Topic
                    oder einem Unterthema.
                    Auch verwandte Begriffe
                    und kleinere Tippfehler
                    werden berücksichtigt.
                  </Text>
                </View>
              ) : null}

              {hasQuery &&
              results.length === 0 ? (
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
                          .textMuted
                      }
                      name="document-outline"
                      size={27}
                    />
                  </View>

                  <Text
                    style={
                      styles.emptyTitle
                    }
                  >
                    Keine Treffer
                  </Text>

                  <Text
                    style={
                      styles.emptyText
                    }
                  >
                    Versuche einen allgemeineren
                    Begriff oder suche direkt
                    nach einer Domäne, einem
                    Topic oder Unterthema.
                  </Text>
                </View>
              ) : null}

              {results.map(
                ({
                  discovery,
                  matchedFields,
                }) => {
                  const hierarchy =
                    getDiscoveryHierarchy(
                      discovery,
                    );

                  const path = [
                    hierarchy.domain,
                    hierarchy.topic,
                    hierarchy
                      .subtopics[0],
                  ]
                    .filter(Boolean)
                    .join(" › ");

                  return (
                    <Pressable
                      key={
                        discovery.id
                      }
                      onPress={() => {
                        openDiscovery(
                          discovery,
                        );
                      }}
                      style={({
                        pressed,
                      }) => [
                        styles.resultCard,

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <View
                        style={
                          styles.resultIcon
                        }
                      >
                        <Ionicons
                          color={
                            universeTheme
                              .colors
                              .primaryBright
                          }
                          name="document-text-outline"
                          size={19}
                        />
                      </View>

                      <View
                        style={
                          styles.resultBody
                        }
                      >
                        <Text
                          numberOfLines={2}
                          style={
                            styles.resultTitle
                          }
                        >
                          {discovery.improvedTitle ||
                            discovery.title}
                        </Text>

                        {path ? (
                          <Text
                            numberOfLines={1}
                            style={
                              styles.resultPath
                            }
                          >
                            {path}
                          </Text>
                        ) : null}

                        {matchedFields.length >
                        0 ? (
                          <Text
                            numberOfLines={1}
                            style={
                              styles.matchReason
                            }
                          >
                            Treffer in{" "}
                            {matchedFields
                              .slice(0, 3)
                              .join(", ")}
                          </Text>
                        ) : null}
                      </View>

                      <Ionicons
                        color={
                          universeTheme.colors
                            .textMuted
                        }
                        name="chevron-forward"
                        size={19}
                      />
                    </Pressable>
                  );
                },
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 18,
      paddingTop: 5,
      width: "100%",
    },

    searchTrigger: {
      alignItems: "center",
      backgroundColor:
        universeTheme.colors
          .surface,
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
      gap: 9,
      minHeight: 48,
      paddingHorizontal: 13,
      width: "100%",
    },

    searchPlaceholder: {
      color:
        universeTheme.colors
          .textMuted,
      flex: 1,
      fontSize: 13,
    },

    aiBadge: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.10)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    aiBadgeText: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 8,
      fontWeight: "900",
    },

    screen: {
      backgroundColor:
        universeTheme.colors
          .background,
      flex: 1,
    },

    header: {
      alignItems: "center",
      borderBottomColor:
        universeTheme.colors
          .border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent:
        "space-between",
      minHeight: 76,
      paddingHorizontal: 18,
    },

    headerText: {
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

    headerTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 20,
      fontWeight: "900",
      marginTop: 3,
    },

    closeButton: {
      alignItems: "center",
      backgroundColor:
        "rgba(148, 163, 184, 0.08)",
      borderRadius: 999,
      height: 40,
      justifyContent:
        "center",
      width: 40,
    },

    searchBar: {
      alignItems: "center",
      backgroundColor:
        universeTheme.colors
          .surfaceStrong,
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: "row",
      gap: 9,
      marginHorizontal: 18,
      marginTop: 16,
      minHeight: 52,
      paddingHorizontal: 14,
    },

    input: {
      color:
        universeTheme.colors
          .text,
      flex: 1,
      fontSize: 14,
      paddingVertical: 13,
    },

    statusRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent:
        "space-between",
      minHeight: 43,
      paddingHorizontal: 18,
    },

    statusBadge: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },

    statusBadgeText: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 9,
    },

    resultCount: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 10,
      fontWeight: "800",
    },

    resultsContent: {
      paddingBottom: 40,
      paddingHorizontal: 18,
    },

    resultCard: {
      alignItems: "center",
      backgroundColor:
        universeTheme.colors
          .surface,
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
      gap: 11,
      marginBottom: 9,
      minHeight: 76,
      padding: 12,
    },

    resultIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.10)",
      borderRadius: 11,
      height: 40,
      justifyContent:
        "center",
      width: 40,
    },

    resultBody: {
      flex: 1,
    },

    resultTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 18,
    },

    resultPath: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      marginTop: 5,
    },

    matchReason: {
      color:
        universeTheme.colors
          .violet,
      fontSize: 8,
      marginTop: 4,
    },

    emptyState: {
      alignItems: "center",
      paddingHorizontal: 25,
      paddingTop: 65,
    },

    emptyIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.09)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      height: 62,
      justifyContent:
        "center",
      width: 62,
    },

    emptyTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 17,
      fontWeight: "900",
      marginTop: 18,
    },

    emptyText: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 12,
      lineHeight: 19,
      marginTop: 8,
      maxWidth: 310,
      textAlign: "center",
    },

    pressed: {
      opacity: 0.65,
    },
  });