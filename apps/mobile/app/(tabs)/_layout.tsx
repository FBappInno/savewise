import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useAppSettings } from "@/providers/app-settings-provider";
import { universeTheme } from "@/theme/universe-theme";

export default function TabLayout() {
  const { t } = useAppSettings();

  return (
    <Tabs
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
            .textSecondary,

        tabBarStyle: {
          backgroundColor: "#050D19",
          borderTopColor:
            universeTheme.colors
              .border,
          borderTopWidth: 1,
          height: 86,
          paddingBottom: 20,
          paddingTop: 8,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              color={color}
              name="home-outline"
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: "Universum",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              color={color}
              name="git-network-outline"
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="insights"
        options={{
          title: t("tabs.brain"),

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              color={color}
              name="hardware-chip-outline"
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="research"
        options={{
          title: t("tabs.research"),

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              color={color}
              name="telescope-outline"
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              color={color}
              name="settings-outline"
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}