import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

const BIOMETRIC_ENABLED_KEY =
  "savewise.account.biometric-enabled.v1";

export type BiometricAvailability = {
  available: boolean;
  label: string;
};

export async function getBiometricAvailability():
  Promise<BiometricAvailability> {
  const hasHardware =
    await LocalAuthentication.hasHardwareAsync();

  const isEnrolled =
    await LocalAuthentication.isEnrolledAsync();

  const supportedTypes =
    await LocalAuthentication.supportedAuthenticationTypesAsync();

  const hasFace =
    supportedTypes.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    );

  const hasFingerprint =
    supportedTypes.includes(
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    );

  return {
    available:
      hasHardware &&
      isEnrolled,

    label:
      hasFace
        ? "Face ID"
        : hasFingerprint
          ? "Touch ID"
          : "Biometrie",
  };
}

export async function authenticateWithBiometrics(
  reason =
    "SaveWise entsperren",
): Promise<boolean> {
  const availability =
    await getBiometricAvailability();

  if (!availability.available) {
    return false;
  }

  const result =
    await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Abbrechen",
      disableDeviceFallback: false,
      fallbackLabel: "Gerätecode verwenden",
    });

  return result.success;
}

export async function setBiometricLoginEnabled(
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(
    BIOMETRIC_ENABLED_KEY,
    enabled
      ? "true"
      : "false",
  );
}

export async function isBiometricLoginEnabled():
  Promise<boolean> {
  return (
    await AsyncStorage.getItem(
      BIOMETRIC_ENABLED_KEY,
    )
  ) === "true";
}
