import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { theme } from "@/theme";

export default function TabLayout() {
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
          title: "Home",

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
          title: "Library",

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
          title: "Insights",

          tabBarIcon: ({
            color,
            size,
          }) => (
            <Ionicons
              color={color}
              name="sparkles-outline"
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",

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