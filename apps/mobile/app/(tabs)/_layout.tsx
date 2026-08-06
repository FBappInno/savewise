import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useAppSettings } from "@/providers/app-settings-provider";
import { universeTheme } from "@/theme/universe-theme";

export default function TabLayout() {
  const { t } =
    useAppSettings();

  return (
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

      {/*
       * Das alte Bibliotheks-/Universumsregister bleibt
       * technisch als Route vorhanden, wird aber nicht mehr
       * in der Tab-Navigation angezeigt.
       *
       * Dadurch verlieren wir vorerst keinen alten Code.
       * Später ersetzen wir library.tsx durch eine reine
       * Discovery-Listenansicht oder löschen die Route.
       */}
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
  );
}