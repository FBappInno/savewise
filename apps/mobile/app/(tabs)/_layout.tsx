import { Ionicons } from "@expo/vector-icons";
import {
  Tabs,
  usePathname,
} from "expo-router";

import {
  StyleSheet,
  View,
} from "react-native";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  CompactWorkspaceSwitcher,
} from "@/components/workspace/compact-workspace-switcher";

import {
  useAppSettings,
} from "@/providers/app-settings-provider";

import {
  universeTheme,
} from "@/theme/universe-theme";

export default function TabLayout() {
  const {
    settings,
    t,
    updateSettings,
  } = useAppSettings();

  const pathname =
    usePathname();

  const insets =
    useSafeAreaInsets();

  const isUniverse =
    pathname === "/" ||
    pathname === "/index" ||
    pathname.endsWith(
      "/(tabs)",
    );

  return (
    <View style={styles.screen}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,

          sceneStyle: {
            backgroundColor:
              universeTheme.colors
                .background,
          },

          tabBarActiveTintColor:
            universeTheme.colors
              .primaryBright,

          tabBarInactiveTintColor:
            universeTheme.colors
              .textMuted,

          tabBarStyle: {
            backgroundColor:
              universeTheme.colors
                .backgroundElevated,

            borderTopColor:
              universeTheme.colors
                .border,

            borderTopWidth: 1,

            height: 84,

            paddingBottom: 21,

            paddingTop: 8,
          },

          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Universum",

            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Ionicons
                color={color}
                name={
                  focused
                    ? "planet"
                    : "planet-outline"
                }
                size={size}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="library"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="insights"
          options={{
            title:
              t("tabs.brain"),

            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Ionicons
                color={color}
                name={
                  focused
                    ? "hardware-chip"
                    : "hardware-chip-outline"
                }
                size={size}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="research"
          options={{
            title:
              t("tabs.research"),

            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Ionicons
                color={color}
                name={
                  focused
                    ? "telescope"
                    : "telescope-outline"
                }
                size={size}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title:
              t("tabs.settings"),

            tabBarIcon: ({
              color,
              size,
              focused,
            }) => (
              <Ionicons
                color={color}
                name={
                  focused
                    ? "settings"
                    : "settings-outline"
                }
                size={size}
              />
            ),
          }}
        />
      </Tabs>

      {!isUniverse ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.workspaceOverlay,

            {
              top:
                Math.max(
                  insets.top,
                  12,
                ) + 8,
            },
          ]}
        >
          <CompactWorkspaceSwitcher
            activeWorkspaceId={
              settings.workspace.activeId
            }
            onChange={async (
              activeId,
            ) => {
              await updateSettings(
                (current) => ({
                  ...current,

                  workspace: {
                    ...current.workspace,
                    activeId,
                  },
                }),
              );
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      backgroundColor:
        universeTheme.colors
          .background,
      flex: 1,
    },

    workspaceOverlay: {
      position: "absolute",
      right: 17,
      zIndex: 50,
    },
  });
