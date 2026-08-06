import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppSettingsProvider, useAppSettings } from "@/providers/app-settings-provider";
import { AnalyticsConsentModal } from "@/components/analytics-consent-modal";
import { trackAnonymousEvent } from "@/services/anonymous-analytics";
import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  isBiometricLoginEnabled,
} from "@/services/biometric-auth-service";
import {
  hasVerifiedAccountSession,
} from "@/services/account-client";
import { universeTheme } from "@/theme/universe-theme";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <AppSettingsProvider>
      <RootNavigator />
    </AppSettingsProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const {
    t,
    updateSettings,
  } = useAppSettings();

  const [
    biometricState,
    setBiometricState,
  ] = useState<
    "checking" |
    "unlocked" |
    "locked"
  >("checking");

  const [
    biometricLabel,
    setBiometricLabel,
  ] = useState("Biometrie");

  const unlockWithBiometrics =
    useCallback(async () => {
      const success =
        await authenticateWithBiometrics(
          "SaveWise entsperren",
        );

      setBiometricState(
        success
          ? "unlocked"
          : "locked",
      );
    }, []);

  useEffect(() => {
    void Promise.all([
      isBiometricLoginEnabled(),
      hasVerifiedAccountSession(),
      getBiometricAvailability(),
    ]).then(
      ([
        biometricEnabled,
        validSession,
        availability,
      ]) => {
        setBiometricLabel(
          availability.label,
        );

        /*
         * Der sichtbare Kontostatus wird nicht lokal erraten,
         * sondern mit der echten Railway-Session synchronisiert.
         */
        void updateSettings(
          (current) => {
            if (
              current.account.hasPassword ===
              validSession
            ) {
              return current;
            }

            return {
              ...current,

              account: {
                ...current.account,
                hasPassword:
                  validSession,
              },
            };
          },
        );

        if (
          biometricEnabled &&
          validSession &&
          availability.available
        ) {
          setBiometricState(
            "locked",
          );

          void unlockWithBiometrics();
          return;
        }

        setBiometricState(
          "unlocked",
        );
      },
    ).catch(() => {
      setBiometricState(
        "unlocked",
      );
    });
  }, [
    unlockWithBiometrics,
    updateSettings,
  ]);

  useEffect(() => {
    void trackAnonymousEvent("AppStart", { operation: "app" });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") void trackAnonymousEvent("AppClosed", { operation: "app" });
    });
    return () => subscription.remove();
  }, []);

  if (
    biometricState !==
    "unlocked"
  ) {
    return (
      <View style={lockStyles.screen}>
        <View style={lockStyles.logo}>
          <Text style={lockStyles.logoText}>
            S
          </Text>
        </View>

        <Text style={lockStyles.title}>
          SaveWise ist geschützt
        </Text>

        <Text style={lockStyles.description}>
          Entsperre dein Wissensuniversum mit {biometricLabel}.
        </Text>

        {biometricState ===
        "checking" ? (
          <ActivityIndicator
            color={
              universeTheme.colors
                .primaryBright
            }
            size="large"
            style={lockStyles.loader}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void unlockWithBiometrics();
            }}
            style={({ pressed }) => [
              lockStyles.button,
              pressed &&
                lockStyles.pressed,
            ]}
          >
            <Text style={lockStyles.buttonText}>
              Mit {biometricLabel} entsperren
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <ThemeProvider
      value={
        colorScheme === "dark"
          ? DarkTheme
          : DefaultTheme
      }
    >
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="discovery/[id]"
          options={{
            headerBackTitle: t("navigation.back"),
            headerShown: true,
            title: t("navigation.discovery"),
          }}
        />

        <Stack.Screen
          name="topic/[id]"
          options={{
            headerBackTitle: t("tabs.library"),
            headerShown: true,
            title: t("navigation.topic"),
          }}
        />

        <Stack.Screen
          name="account"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="account-verified"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            title: "Modal",
          }}
        />
      </Stack>

      <StatusBar style="auto" />
      <AnalyticsConsentModal />
    </ThemeProvider>
  );
}


const lockStyles = StyleSheet.create({
  screen: {
    alignItems: "center",
    backgroundColor: universeTheme.colors.background,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  logo: {
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.13)",
    borderColor: universeTheme.colors.primaryBright,
    borderRadius: 23,
    borderWidth: 1.5,
    height: 76,
    justifyContent: "center",
    width: 76,
  },

  logoText: {
    color: universeTheme.colors.primaryBright,
    fontSize: 31,
    fontWeight: "900",
  },

  title: {
    color: universeTheme.colors.text,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 23,
  },

  description: {
    color: universeTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
    textAlign: "center",
  },

  loader: {
    marginTop: 28,
  },

  button: {
    alignItems: "center",
    backgroundColor: universeTheme.colors.primaryBright,
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 28,
    minHeight: 52,
    paddingHorizontal: 24,
  },

  buttonText: {
    color: "#03111E",
    fontSize: 13,
    fontWeight: "900",
  },

  pressed: {
    opacity: 0.67,
  },
});
