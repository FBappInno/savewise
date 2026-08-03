import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { theme } from "@/theme";
import { useAppSettings } from "@/providers/app-settings-provider";

export default function TabLayout() {
  const { t } = useAppSettings();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor:
          theme.colors.primary,

        tabBarInactiveTintColor:
          theme.colors.textSecondary,
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
          title: t("tabs.library"),

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              color={color}
              name="library-outline"
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
          tabBarIcon: ({ color, size }) => (
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
