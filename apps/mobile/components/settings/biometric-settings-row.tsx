import { Ionicons } from "@expo/vector-icons";

import {
  useEffect,
  useState,
} from "react";

import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import {
  authenticateWithBiometrics,
  getBiometricAvailability,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
} from "@/services/biometric-auth-service";

import {
  hasVerifiedAccountSession,
} from "@/services/account-client";

import {
  universeTheme,
} from "@/theme/universe-theme";

type BiometricSettingsRowProps = {
  isSignedIn: boolean;
};

export function BiometricSettingsRow({
  isSignedIn,
}: BiometricSettingsRowProps) {
  const [
    biometricLabel,
    setBiometricLabel,
  ] = useState("Biometrie");

  const [
    isAvailable,
    setAvailable,
  ] = useState(false);

  const [
    isEnabled,
    setEnabled,
  ] = useState(false);

  const [
    isLoading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    void Promise.all([
      getBiometricAvailability(),
      isBiometricLoginEnabled(),
    ])
      .then(
        ([
          availability,
          enabled,
        ]) => {
          setBiometricLabel(
            availability.label,
          );

          setAvailable(
            availability.available,
          );

          setEnabled(
            enabled &&
              availability.available,
          );
        },
      )
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleChange(
    nextEnabled: boolean,
  ) {
    if (isLoading) {
      return;
    }

    if (!nextEnabled) {
      await setBiometricLoginEnabled(
        false,
      );

      setEnabled(false);

      return;
    }

    const validSession =
      await hasVerifiedAccountSession();

    if (
      !isSignedIn ||
      !validSession
    ) {
      Alert.alert(
        "Anmeldung erforderlich",
        `Melde dich zuerst bei deinem SaveWise-Konto an, bevor du ${biometricLabel} aktivierst.`,
      );

      return;
    }

    const availability =
      await getBiometricAvailability();

    setBiometricLabel(
      availability.label,
    );

    setAvailable(
      availability.available,
    );

    if (!availability.available) {
      Alert.alert(
        `${availability.label} nicht verfügbar`,
        `Richte ${availability.label} zuerst in den iPhone-Einstellungen ein.`,
      );

      return;
    }

    const authenticated =
      await authenticateWithBiometrics(
        `${availability.label} für SaveWise aktivieren`,
      );

    if (!authenticated) {
      return;
    }

    await setBiometricLoginEnabled(
      true,
    );

    setEnabled(true);
  }

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons
          color={
            isEnabled
              ? universeTheme.colors.green
              : universeTheme.colors
                  .primaryBright
          }
          name="scan-outline"
          size={21}
        />
      </View>

      <View style={styles.textArea}>
        <Text style={styles.title}>
          {biometricLabel}
        </Text>

        <Text style={styles.description}>
          {isEnabled
            ? "SaveWise wird beim Öffnen biometrisch geschützt."
            : isAvailable
              ? "App beim Öffnen biometrisch entsperren."
              : "Auf diesem Gerät derzeit nicht verfügbar."}
        </Text>
      </View>

      <Switch
        disabled={
          isLoading ||
          !isAvailable
        }
        ios_backgroundColor={
          universeTheme.colors.border
        }
        onValueChange={(value) => {
          void handleChange(value);
        }}
        trackColor={{
          false:
            universeTheme.colors.border,

          true:
            "rgba(74, 222, 128, 0.42)",
        }}
        value={isEnabled}
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      alignItems: "center",

      backgroundColor:
        "rgba(3, 12, 24, 0.68)",

      borderColor:
        universeTheme.colors.border,

      borderRadius:
        universeTheme.radius.md,

      borderWidth: 1,

      flexDirection: "row",

      gap: 11,

      marginTop: 10,

      minHeight: 64,

      paddingHorizontal: 12,

      paddingVertical: 10,
    },

    icon: {
      alignItems: "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.09)",

      borderRadius: 11,

      height: 39,

      justifyContent: "center",

      width: 39,
    },

    textArea: {
      flex: 1,
    },

    title: {
      color:
        universeTheme.colors.text,

      fontSize: 12,

      fontWeight: "900",
    },

    description: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize: 8,

      lineHeight: 13,

      marginTop: 3,
    },
  });
