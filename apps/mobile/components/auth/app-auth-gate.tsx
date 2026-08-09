import {
  router,
  usePathname,
} from "expo-router";

import {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useAppSettings,
} from "@/providers/app-settings-provider";

import {
  hasVerifiedAccountSession,
} from "@/services/account-client";

import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  isBiometricLoginEnabled,
} from "@/services/biometric-auth-service";

import {
  universeTheme,
} from "@/theme/universe-theme";


type GateState =
  | "checking"
  | "public"
  | "unlocked";


const PUBLIC_ROUTES =
  new Set([
    "/account",
    "/account-verified",
  ]);


export function AppAuthGate({
  children,
}: PropsWithChildren) {
  const pathname =
    usePathname();

  const {
    isReady,
    settings,
    updateSettings,
  } =
    useAppSettings();

  const [
    gateState,
    setGateState,
  ] =
    useState<GateState>(
      "checking",
    );

  /*
   * Verhindert parallele Session- /
   * Face-ID-Prüfungen.
   */
  const checkingRef =
    useRef(false);

  /*
   * Wenn der Benutzer gerade auf dem
   * Login-Screen war und sich erfolgreich
   * mit Passwort angemeldet hat, wird beim
   * direkten Wechsel zu SaveWise NICHT
   * nochmals Face ID verlangt.
   *
   * Dieser Wert lebt nur im aktuellen
   * App-Prozess und verschwindet bei einem
   * vollständigen Neustart.
   */
  const visitedAccountRouteRef =
    useRef(false);


  useEffect(() => {
    if (!isReady) {
      return;
    }

    const isPublicRoute =
      PUBLIC_ROUTES.has(
        pathname,
      );

    if (isPublicRoute) {
      if (
        pathname ===
        "/account"
      ) {
        visitedAccountRouteRef.current =
          true;
      }

      setGateState(
        "public",
      );

      return;
    }

    if (
      gateState ===
      "unlocked"
    ) {
      return;
    }

    if (
      checkingRef.current
    ) {
      return;
    }

    checkingRef.current =
      true;

    setGateState(
      "checking",
    );

    void unlockApp()
      .finally(() => {
        checkingRef.current =
          false;
      });


    async function unlockApp() {
      /*
       * Zuerst wird NICHT nur geprüft,
       * ob lokal irgendein Token liegt,
       * sondern ob die Session beim
       * SaveWise-Backend tatsächlich
       * noch gültig ist.
       */
      const validSession =
        await hasVerifiedAccountSession();

      if (!validSession) {
        if (
          settings.account
            .hasPassword
        ) {
          await updateSettings(
            (current) => ({
              ...current,

              account: {
                ...current.account,

                hasPassword:
                  false,
              },
            }),
          );
        }

        setGateState(
          "public",
        );

        router.replace(
          "/account" as never,
        );

        return;
      }

      /*
       * Eine gültige Session bedeutet:
       * Das Konto ist tatsächlich
       * angemeldet.
       *
       * Damit stimmt auch die Anzeige
       * unter Einstellungen wieder mit
       * der echten Session überein.
       */
      if (
        !settings.account
          .hasPassword
      ) {
        await updateSettings(
          (current) => ({
            ...current,

            account: {
              ...current.account,

              hasPassword:
                true,
            },
          }),
        );
      }

      /*
       * Kommt der Benutzer gerade direkt
       * vom Passwort-Login, ist er bereits
       * authentifiziert.
       *
       * Keine zweite Face-ID-Abfrage.
       */
      if (
        visitedAccountRouteRef.current
      ) {
        visitedAccountRouteRef.current =
          false;

        setGateState(
          "unlocked",
        );

        return;
      }

      const biometricEnabled =
        await isBiometricLoginEnabled();

      if (!biometricEnabled) {
        setGateState(
          "unlocked",
        );

        return;
      }

      const availability =
        await getBiometricAvailability();

      if (
        !availability.available
      ) {
        /*
         * Face ID wurde aktiviert, ist
         * aktuell aber nicht verfügbar.
         *
         * Dann muss der Benutzer sich
         * klassisch anmelden.
         */
        setGateState(
          "public",
        );

        router.replace(
          "/account" as never,
        );

        return;
      }

      const authenticated =
        await authenticateWithBiometrics(
          `${availability.label} zum Entsperren von SaveWise`,
        );

      if (!authenticated) {
        setGateState(
          "public",
        );

        router.replace(
          "/account" as never,
        );

        return;
      }

      setGateState(
        "unlocked",
      );
    }
  }, [
    gateState,
    isReady,
    pathname,
    settings.account.hasPassword,
    updateSettings,
  ]);


  /*
   * Login und Kontobestätigung müssen
   * immer sichtbar bleiben.
   */
  if (
    gateState ===
      "public"
    && PUBLIC_ROUTES.has(
      pathname,
    )
  ) {
    return children;
  }


  if (
    gateState ===
    "unlocked"
  ) {
    return children;
  }


  return (
    <View
      style={
        styles.loadingScreen
      }
    >
      <View
        style={
          styles.logo
        }
      >
        <Text
          style={
            styles.logoText
          }
        >
          S
        </Text>
      </View>

      <Text
        style={
          styles.title
        }
      >
        SaveWise
      </Text>

      <Text
        style={
          styles.description
        }
      >
        Konto wird geprüft …
      </Text>

      <ActivityIndicator
        color={
          universeTheme.colors
            .primaryBright
        }
        size="small"
        style={
          styles.spinner
        }
      />
    </View>
  );
}


const styles =
  StyleSheet.create({
    loadingScreen: {
      alignItems:
        "center",

      backgroundColor:
        universeTheme.colors
          .background,

      flex:
        1,

      justifyContent:
        "center",
    },

    logo: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.12)",

      borderColor:
        universeTheme.colors
          .primaryBright,

      borderRadius:
        22,

      borderWidth:
        1,

      height:
        64,

      justifyContent:
        "center",

      width:
        64,
    },

    logoText: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        30,

      fontWeight:
        "900",
    },

    title: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        20,

      fontWeight:
        "900",

      marginTop:
        16,
    },

    description: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        11,

      marginTop:
        6,
    },

    spinner: {
      marginTop:
        20,
    },
  });
