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

type CompactWorkspaceSwitcherProps = {
  activeWorkspaceId: WorkspaceId;

  onChange: (
    workspaceId: WorkspaceId,
  ) => void | Promise<void>;
};

export function CompactWorkspaceSwitcher({
  activeWorkspaceId,
  onChange,
}: CompactWorkspaceSwitcherProps) {
  const [
    isOpen,
    setOpen,
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
    setOpen(false);

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
      <Pressable
        accessibilityLabel={`Aktiver Workspace: ${activeWorkspace.label}`}
        accessibilityRole="button"
        onPress={() => {
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.trigger,

          {
            borderColor:
              `${activeColor}55`,

            backgroundColor:
              `${activeColor}12`,
          },

          pressed &&
            styles.pressed,
        ]}
      >
        <Ionicons
          color={activeColor}
          name={
            activeWorkspace.activeIcon
          }
          size={15}
        />

        <Text
          numberOfLines={1}
          style={[
            styles.triggerText,

            {
              color: activeColor,
            },
          ]}
        >
          {activeWorkspace.label}
        </Text>

        <Ionicons
          color={activeColor}
          name="chevron-down"
          size={12}
        />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setOpen(false);
        }}
        transparent
        visible={isOpen}
      >
        <Pressable
          onPress={() => {
            setOpen(false);
          }}
          style={styles.backdrop}
        >
          <Pressable
            onPress={() =>
              undefined
            }
            style={styles.sheet}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>
                  WISSENSBEREICH
                </Text>

                <Text style={styles.title}>
                  Workspace wechseln
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Schliessen"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => {
                  setOpen(false);
                }}
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

            {WORKSPACES.map(
              (workspace) => {
                const isActive =
                  workspace.id ===
                  activeWorkspaceId;

                const color =
                  workspace.tone ===
                  "violet"
                    ? universeTheme
                        .colors.violet
                    : universeTheme
                        .colors
                        .primaryBright;

                return (
                  <Pressable
                    key={workspace.id}
                    accessibilityRole="button"
                    onPress={() => {
                      void selectWorkspace(
                        workspace.id,
                      );
                    }}
                    style={({ pressed }) => [
                      styles.option,

                      isActive &&
                        styles.optionActive,

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
                          isActive
                            ? workspace.activeIcon
                            : workspace.icon
                        }
                        size={20}
                      />
                    </View>

                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>
                        {workspace.label}
                      </Text>

                      <Text
                        style={
                          styles.optionDescription
                        }
                      >
                        {workspace.id ===
                        "private"
                          ? "Persönliches Wissen und private Discoveries"
                          : "Berufliches Wissen, Projekte und Unternehmen"}
                      </Text>
                    </View>

                    {isActive ? (
                      <Ionicons
                        color={color}
                        name="checkmark-circle"
                        size={21}
                      />
                    ) : (
                      <Ionicons
                        color={
                          universeTheme.colors
                            .textMuted
                        }
                        name="ellipse-outline"
                        size={21}
                      />
                    )}
                  </Pressable>
                );
              },
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    trigger: {
      alignItems: "center",
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      minHeight: 30,
      paddingHorizontal: 9,
    },

    triggerText: {
      fontSize: 10,
      fontWeight: "900",
      maxWidth: 82,
    },

    backdrop: {
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

    header: {
      alignItems: "center",
      borderBottomColor:
        universeTheme.colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent:
        "space-between",
      marginBottom: 5,
      paddingBottom: 14,
    },

    eyebrow: {
      color:
        universeTheme.colors.primary,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1,
    },

    title: {
      color:
        universeTheme.colors.text,
      fontSize: 18,
      fontWeight: "900",
      marginTop: 3,
    },

    option: {
      alignItems: "center",
      borderBottomColor:
        universeTheme.colors.border,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      flexDirection: "row",
      gap: 11,
      minHeight: 74,
      paddingHorizontal: 4,
      paddingVertical: 10,
    },

    optionActive: {
      backgroundColor:
        "rgba(56, 189, 248, 0.04)",
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
        universeTheme.colors.text,
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

    pressed: {
      opacity: 0.67,
    },
  });
