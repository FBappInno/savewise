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
  MissionHeader,
} from "@/components/layout/mission-header";

import {
  useAppSettings,
} from "@/providers/app-settings-provider";

import {
  universeTheme,
} from "@/theme/universe-theme";

type HeaderConfiguration = {
  icon:
    keyof typeof Ionicons.glyphMap;

  title: string;

  subtitle: string;
};

export default function TabLayout() {
  const {
    settings,
    t,
    updateSettings,
  } = useAppSettings();

  const pathname =
    usePathname();

  const headerConfiguration =
    getHeaderConfiguration(
      pathname,
    );

  return (
    <View style={styles.screen}>
      {headerConfiguration ? (
        <MissionHeader
          activeWorkspaceId={
            settings.workspace.activeId
          }
          icon={
            headerConfiguration.icon
          }
          onWorkspaceChange={async (
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
          subtitle={
            headerConfiguration.subtitle
          }
          title={
            headerConfiguration.title
          }
        />
      ) : null}

      <View style={styles.tabs}>
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
      </View>
    </View>
  );
}

function getHeaderConfiguration(
  pathname: string,
): HeaderConfiguration | null {
  if (
    pathname.includes(
      "/insights",
    )
  ) {
    return {
      icon:
        "hardware-chip-outline",

      title:
        "KI & Erkenntnisse",

      subtitle:
        "Verbindungen und Muster in deinem Wissen",
    };
  }

  if (
    pathname.includes(
      "/research",
    )
  ) {
    return {
      icon:
        "telescope-outline",

      title:
        "Research",

      subtitle:
        "Neue Quellen, Trends und Wissenslücken",
    };
  }

  if (
    pathname.includes(
      "/settings",
    )
  ) {
    return {
      icon:
        "settings-outline",

      title:
        "Einstellungen",

      subtitle:
        "Konto, Workspaces und App-Konfiguration",
    };
  }

  /*
   * Das Universum besitzt bereits einen eigenen
   * starken Kopfbereich und erhält deshalb keinen
   * zusätzlichen MissionHeader.
   */
  return null;
}

const styles =
  StyleSheet.create({
    screen: {
      backgroundColor:
        universeTheme.colors
          .background,

      flex: 1,
    },

    tabs: {
      flex: 1,
    },
  });
