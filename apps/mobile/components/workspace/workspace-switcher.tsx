import { Ionicons } from "@expo/vector-icons";

import {
  useState,
} from "react";

import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  universeTheme,
} from "@/theme/universe-theme";

import type {
  WorkspaceId,
} from "@/types/app-settings";

import {
  getWorkspaceDefinition,
  WORKSPACES,
} from "@/utils/workspace";

type WorkspaceSwitcherProps = {
  activeWorkspaceId: WorkspaceId;

  discoveryCount: number;

  domainCount: number;

  onChange: (
    workspaceId: WorkspaceId,
  ) => void | Promise<void>;
};

export function WorkspaceSwitcher({
  activeWorkspaceId,
  discoveryCount,
  domainCount,
  onChange,
}: WorkspaceSwitcherProps) {
  const [
    visible,
    setVisible,
  ] = useState(false);

  const activeWorkspace =
    getWorkspaceDefinition(
      activeWorkspaceId,
    );

  const activeColor =
    activeWorkspace.tone ===
    "violet"
      ? universeTheme.colors.violet
      : universeTheme.colors
          .primaryBright;

  async function selectWorkspace(
    workspaceId: WorkspaceId,
  ) {
    setVisible(false);

    if (
      workspaceId ===
      activeWorkspaceId
    ) {
      return;
    }

    await onChange(
      workspaceId,
    );
  }

  return (
    <>
      <View
        style={
          styles.wrapper
        }
      >
        <Pressable
          accessibilityLabel={`Aktiver Workspace: ${activeWorkspace.label}`}
          accessibilityRole="button"
          onPress={() => {
            setVisible(true);
          }}
          style={({ pressed }) => [
            styles.trigger,

            {
              borderColor:
                `${activeColor}55`,
            },

            pressed &&
              styles.pressed,
          ]}
        >
          <View
            style={[
              styles.activeIcon,

              {
                backgroundColor:
                  `${activeColor}18`,

                borderColor:
                  `${activeColor}44`,
              },
            ]}
          >
            <Ionicons
              color={activeColor}
              name={
                activeWorkspace
                  .activeIcon
              }
              size={20}
            />
          </View>

          <View
            style={
              styles.workspaceText
            }
          >
            <Text
              style={[
                styles.workspaceEyebrow,

                {
                  color:
                    activeColor,
                },
              ]}
            >
              AKTIVER WORKSPACE
            </Text>

            <Text
              style={
                styles.workspaceName
              }
            >
              {
                activeWorkspace.label
              }
            </Text>
          </View>

          <View
            style={
              styles.workspaceStats
            }
          >
            <Text
              style={
                styles.workspaceStatsValue
              }
            >
              {discoveryCount}
            </Text>

            <Text
              style={
                styles.workspaceStatsLabel
              }
            >
              Discoveries
            </Text>
          </View>

          <View
            style={
              styles.workspaceStats
            }
          >
            <Text
              style={
                styles.workspaceStatsValue
              }
            >
              {domainCount}
            </Text>

            <Text
              style={
                styles.workspaceStatsLabel
              }
            >
              Domänen
            </Text>
          </View>

          <Ionicons
            color={
              universeTheme.colors
                .textMuted
            }
            name="chevron-down"
            size={18}
          />
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setVisible(false);
        }}
        transparent
        visible={visible}
      >
        <Pressable
          onPress={() => {
            setVisible(false);
          }}
          style={
            styles.modalBackdrop
          }
        >
          <Pressable
            onPress={() =>
              undefined
            }
            style={
              styles.sheet
            }
          >
            <View
              style={
                styles.sheetHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sheetEyebrow
                  }
                >
                  WISSENSBEREICH
                </Text>

                <Text
                  style={
                    styles.sheetTitle
                  }
                >
                  Workspace auswählen
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Workspace-Auswahl schließen"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => {
                  setVisible(false);
                }}
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .textSecondary
                  }
                  name="close"
                  size={23}
                />
              </Pressable>
            </View>

            {WORKSPACES.map(
              (workspace) => {
                const selected =
                  workspace.id ===
                  activeWorkspaceId;

                const color =
                  workspace.tone ===
                  "violet"
                    ? universeTheme
                        .colors
                        .violet
                    : universeTheme
                        .colors
                        .primaryBright;

                return (
                  <Pressable
                    key={
                      workspace.id
                    }
                    accessibilityRole="button"
                    onPress={() => {
                      void selectWorkspace(
                        workspace.id,
                      );
                    }}
                    style={({
                      pressed,
                    }) => [
                      styles.option,

                      selected &&
                        styles.optionSelected,

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.optionIcon,

                        {
                          backgroundColor:
                            `${color}14`,

                          borderColor:
                            `${color}44`,
                        },
                      ]}
                    >
                      <Ionicons
                        color={color}
                        name={
                          selected
                            ? workspace.activeIcon
                            : workspace.icon
                        }
                        size={21}
                      />
                    </View>

                    <View
                      style={
                        styles.optionText
                      }
                    >
                      <Text
                        style={
                          styles.optionTitle
                        }
                      >
                        {
                          workspace.label
                        }
                      </Text>

                      <Text
                        style={
                          styles.optionDescription
                        }
                      >
                        {workspace.id ===
                        "private"
                          ? "Persönliches Wissen und private Interessen"
                          : "Berufliches Wissen, Projekte und Unternehmen"}
                      </Text>
                    </View>

                    {selected ? (
                      <Ionicons
                        color={color}
                        name="checkmark-circle"
                        size={22}
                      />
                    ) : null}
                  </Pressable>
                );
              },
            )}

            <View
              style={
                styles.divider
              }
            />

            <View
              style={
                styles.futureOption
              }
            >
              <View
                style={
                  styles.futureIcon
                }
              >
                <Ionicons
                  color={
                    universeTheme.colors
                      .textMuted
                  }
                  name="add"
                  size={20}
                />
              </View>

              <View
                style={
                  styles.optionText
                }
              >
                <Text
                  style={
                    styles.futureTitle
                  }
                >
                  Neuer Workspace
                </Text>

                <Text
                  style={
                    styles.futureDescription
                  }
                >
                  Eigene Bereiche und
                  Projekte folgen später.
                </Text>
              </View>

              <View
                style={
                  styles.comingSoonBadge
                }
              >
                <Text
                  style={
                    styles.comingSoonText
                  }
                >
                  BALD
                </Text>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 18,
      paddingTop: 2,
    },

    trigger: {
      alignItems: "center",
      backgroundColor:
        "rgba(7, 17, 31, 0.92)",
      borderRadius: 17,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      minHeight: 68,
      paddingHorizontal: 12,
      width: "100%",
    },

    activeIcon: {
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },

    workspaceText: {
      flex: 1,
    },

    workspaceEyebrow: {
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.9,
    },

    workspaceName: {
      color:
        universeTheme.colors
          .text,
      fontSize: 14,
      fontWeight: "900",
      marginTop: 3,
    },

    workspaceStats: {
      alignItems: "center",
      minWidth: 46,
    },

    workspaceStatsValue: {
      color:
        universeTheme.colors
          .text,
      fontSize: 12,
      fontWeight: "900",
    },

    workspaceStatsLabel: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 7,
      marginTop: 2,
    },

    modalBackdrop: {
      backgroundColor:
        "rgba(1, 6, 15, 0.82)",
      flex: 1,
      justifyContent: "flex-end",
      padding: 17,
    },

    sheet: {
      backgroundColor: "#071426",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 22,
      borderWidth: 1,
      padding: 17,
    },

    sheetHeader: {
      alignItems: "center",
      borderBottomColor:
        universeTheme.colors
          .border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent:
        "space-between",
      paddingBottom: 14,
    },

    sheetEyebrow: {
      color:
        universeTheme.colors
          .primary,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },

    sheetTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 3,
    },

    option: {
      alignItems: "center",
      borderBottomColor:
        universeTheme.colors
          .border,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: 11,
      minHeight: 74,
      paddingHorizontal: 5,
      paddingVertical: 10,
    },

    optionSelected: {
      backgroundColor:
        "rgba(56, 189, 248, 0.05)",
    },

    optionIcon: {
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },

    optionText: {
      flex: 1,
    },

    optionTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 13,
      fontWeight: "900",
    },

    optionDescription: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 4,
    },

    divider: {
      backgroundColor:
        universeTheme.colors
          .border,
      height: 1,
      marginVertical: 10,
    },

    futureOption: {
      alignItems: "center",
      flexDirection: "row",
      gap: 11,
      minHeight: 67,
      opacity: 0.65,
      paddingHorizontal: 5,
    },

    futureIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(148, 163, 184, 0.07)",
      borderRadius: 12,
      height: 42,
      justifyContent: "center",
      width: 42,
    },

    futureTitle: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 12,
      fontWeight: "800",
    },

    futureDescription: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 9,
      marginTop: 3,
    },

    comingSoonBadge: {
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    comingSoonText: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.7,
    },

    pressed: {
      opacity: 0.68,
    },
  });