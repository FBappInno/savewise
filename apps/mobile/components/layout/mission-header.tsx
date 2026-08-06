import { Ionicons } from "@expo/vector-icons";

import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  CompactWorkspaceSwitcher,
} from "@/components/workspace/compact-workspace-switcher";

import {
  universeTheme,
} from "@/theme/universe-theme";

import type {
  WorkspaceId,
} from "@/types/app-settings";

type MissionHeaderProps = {
  icon:
    keyof typeof Ionicons.glyphMap;

  title: string;

  subtitle?: string;

  activeWorkspaceId:
    WorkspaceId;

  onWorkspaceChange: (
    workspaceId: WorkspaceId,
  ) => void | Promise<void>;
};

export function MissionHeader({
  icon,
  title,
  subtitle,
  activeWorkspaceId,
  onWorkspaceChange,
}: MissionHeaderProps) {
  const insets =
    useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,

        {
          paddingTop:
            Math.max(
              insets.top,
              12,
            ) + 8,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.identity}>
          <View style={styles.iconContainer}>
            <Ionicons
              color={
                universeTheme.colors
                  .primaryBright
              }
              name={icon}
              size={19}
            />
          </View>

          <View style={styles.titleArea}>
            <Text style={styles.eyebrow}>
              SAVEWISE
            </Text>

            <Text
              numberOfLines={1}
              style={styles.title}
            >
              {title}
            </Text>

            {subtitle ? (
              <Text
                numberOfLines={1}
                style={styles.subtitle}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <CompactWorkspaceSwitcher
          activeWorkspaceId={
            activeWorkspaceId
          }
          onChange={
            onWorkspaceChange
          }
        />
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      backgroundColor:
        universeTheme.colors
          .backgroundElevated,

      borderBottomColor:
        universeTheme.colors.border,

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      paddingBottom: 11,

      paddingHorizontal: 17,
    },

    content: {
      alignItems: "center",

      flexDirection: "row",

      gap: 12,

      justifyContent:
        "space-between",

      minHeight: 47,
    },

    identity: {
      alignItems: "center",

      flex: 1,

      flexDirection: "row",

      gap: 10,
    },

    iconContainer: {
      alignItems: "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.10)",

      borderColor:
        universeTheme.colors
          .borderStrong,

      borderRadius: 11,

      borderWidth: 1,

      height: 38,

      justifyContent: "center",

      width: 38,
    },

    titleArea: {
      flex: 1,
    },

    eyebrow: {
      color:
        universeTheme.colors
          .primary,

      fontSize: 7,

      fontWeight: "900",

      letterSpacing: 1,
    },

    title: {
      color:
        universeTheme.colors.text,

      fontSize: 17,

      fontWeight: "900",

      marginTop: 1,
    },

    subtitle: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize: 8,

      marginTop: 2,
    },
  });
