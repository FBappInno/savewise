import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import {
  Stack,
} from "expo-router";

import {
  StatusBar,
} from "expo-status-bar";

import {
  useEffect,
} from "react";

import {
  AppState,
} from "react-native";

import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";

import "react-native-reanimated";

import {
  AnalyticsConsentModal,
} from "@/components/analytics-consent-modal";

import {
  useColorScheme,
} from "@/hooks/use-color-scheme";

import {
  AppSettingsProvider,
  useAppSettings,
} from "@/providers/app-settings-provider";

import {
  trackAnonymousEvent,
} from "@/services/anonymous-analytics";

export const unstable_settings = {
  anchor:
    "(tabs)",
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView
      style={{
        flex:
          1,
      }}
    >
      <AppSettingsProvider>
        <RootNavigator />
      </AppSettingsProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const colorScheme =
    useColorScheme();

  const {
    t,
  } =
    useAppSettings();

  useEffect(() => {
    void trackAnonymousEvent(
      "AppStart",
      {
        operation:
          "app",
      },
    );

    const subscription =
      AppState.addEventListener(
        "change",
        (state) => {
          if (
            state ===
            "background"
          ) {
            void trackAnonymousEvent(
              "AppClosed",
              {
                operation:
                  "app",
              },
            );
          }
        },
      );

    return () =>
      subscription.remove();
  }, []);

  return (
    <ThemeProvider
      value={
        colorScheme ===
        "dark"
          ? DarkTheme
          : DefaultTheme
      }
    >
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown:
              false,
          }}
        />

        <Stack.Screen
          name="discovery/[id]"
          options={{
            headerBackTitle:
              t(
                "navigation.back",
              ),

            headerShown:
              true,

            title:
              t(
                "navigation.discovery",
              ),
          }}
        />

        <Stack.Screen
          name="topic/[id]"
          options={{
            headerBackTitle:
              t(
                "tabs.library",
              ),

            headerShown:
              true,

            title:
              t(
                "navigation.topic",
              ),
          }}
        />

        <Stack.Screen
          name="account-verified"
          options={{
            headerShown:
              false,
          }}
        />

        <Stack.Screen
          name="modal"
          options={{
            presentation:
              "modal",

            title:
              "Modal",
          }}
        />
      </Stack>

      <StatusBar
        style="auto"
      />

      <AnalyticsConsentModal />
    </ThemeProvider>
  );
}
