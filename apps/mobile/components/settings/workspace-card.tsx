import { Ionicons } from "@expo/vector-icons";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { universeTheme } from "@/theme/universe-theme";

import type {
  WorkspaceId,
} from "@/types/app-settings";

type WorkspaceCardProps = {
  activeWorkspaceId: WorkspaceId;

  onChange: (
    workspaceId: WorkspaceId,
  ) => void | Promise<void>;
};

type WorkspaceOption = {
  id: WorkspaceId;
  label: string;
  description: string;
  icon:
    | "home"
    | "briefcase";
  tone:
    | "private"
    | "business";
};

const WORKSPACE_OPTIONS:
  WorkspaceOption[] = [
  {
    id: "private",
    label: "Privat",
    description:
      "Persönliches Wissen, Interessen und private Discoveries.",
    icon: "home",
    tone: "private",
  },

  {
    id: "business",
    label: "Geschäftlich",
    description:
      "Berufliches Wissen, Projekte und Unternehmen.",
    icon: "briefcase",
    tone: "business",
  },
];

export function WorkspaceCard({
  activeWorkspaceId,
  onChange,
}: WorkspaceCardProps) {
  return (
    <View style={styles.wrapper}>
      {WORKSPACE_OPTIONS.map(
        (workspace) => {
          const isActive =
            workspace.id ===
            activeWorkspaceId;

          const isBusiness =
            workspace.tone ===
            "business";

          const accentColor =
            isBusiness
              ? universeTheme.colors
                  .violet
              : universeTheme.colors
                  .primaryBright;

          return (
            <Pressable
              key={workspace.id}
              accessibilityLabel={`${workspace.label} Workspace auswählen`}
              accessibilityRole="button"
              onPress={() => {
                void onChange(
                  workspace.id,
                );
              }}
              style={({ pressed }) => [
                styles.workspaceOption,

                isActive &&
                  styles.workspaceOptionActive,

                isActive && {
                  borderColor:
                    `${accentColor}66`,
                },

                pressed &&
                  styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.workspaceIcon,

                  {
                    backgroundColor:
                      `${accentColor}14`,

                    borderColor:
                      `${accentColor}44`,
                  },
                ]}
              >
                <Ionicons
                  color={accentColor}
                  name={workspace.icon}
                  size={20}
                />
              </View>

              <View style={styles.textArea}>
                <View
                  style={
                    styles.titleRow
                  }
                >
                  <Text
                    style={
                      styles.workspaceTitle
                    }
                  >
                    {workspace.label}
                  </Text>

                  {isActive ? (
                    <View
                      style={[
                        styles.activeBadge,

                        {
                          backgroundColor:
                            `${accentColor}14`,

                          borderColor:
                            `${accentColor}55`,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.activeDot,

                          {
                            backgroundColor:
                              accentColor,
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.activeBadgeText,

                          {
                            color:
                              accentColor,
                          },
                        ]}
                      >
                        AKTIV
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text
                  style={
                    styles.workspaceDescription
                  }
                >
                  {
                    workspace.description
                  }
                </Text>
              </View>

              <Ionicons
                color={
                  isActive
                    ? accentColor
                    : universeTheme.colors
                        .textMuted
                }
                name={
                  isActive
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={22}
              />
            </Pressable>
          );
        },
      )}

      <View style={styles.divider} />

      <View style={styles.futureWorkspace}>
        <View style={styles.futureIcon}>
          <Ionicons
            color={
              universeTheme.colors
                .textMuted
            }
            name="add"
            size={20}
          />
        </View>

        <View style={styles.textArea}>
          <Text style={styles.futureTitle}>
            Neuer Workspace
          </Text>

          <Text
            style={
              styles.futureDescription
            }
          >
            Eigene Projekte und zusätzliche Wissensbereiche folgen später.
          </Text>
        </View>

        <View style={styles.soonBadge}>
          <Text style={styles.soonText}>
            BALD
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    wrapper: {
      gap: 10,
    },

    workspaceOption: {
      alignItems: "center",
      backgroundColor:
        "rgba(3, 12, 24, 0.68)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius:
        universeTheme.radius.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: 11,
      minHeight: 78,
      paddingHorizontal: 12,
      paddingVertical: 11,
    },

    workspaceOptionActive: {
      backgroundColor:
        "rgba(56, 189, 248, 0.045)",
    },

    workspaceIcon: {
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      height: 42,
      justifyContent: "center",
      width: 42,
    },

    textArea: {
      flex: 1,
    },

    titleRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },

    workspaceTitle: {
      color:
        universeTheme.colors.text,
      fontSize: 13,
      fontWeight: "900",
    },

    workspaceDescription: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 5,
    },

    activeBadge: {
      alignItems: "center",
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },

    activeDot: {
      borderRadius: 999,
      height: 5,
      width: 5,
    },

    activeBadgeText: {
      fontSize: 6,
      fontWeight: "900",
      letterSpacing: 0.55,
    },

    divider: {
      backgroundColor:
        universeTheme.colors
          .border,
      height:
        StyleSheet.hairlineWidth,
      marginVertical: 3,
    },

    futureWorkspace: {
      alignItems: "center",
      flexDirection: "row",
      gap: 11,
      minHeight: 66,
      opacity: 0.58,
      paddingHorizontal: 12,
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
      fontWeight: "900",
    },

    futureDescription: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 8,
      lineHeight: 13,
      marginTop: 4,
    },

    soonBadge: {
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    soonText: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 6,
      fontWeight: "900",
      letterSpacing: 0.6,
    },

    pressed: {
      opacity: 0.67,
    },
  });
