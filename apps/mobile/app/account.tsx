import { Ionicons } from "@expo/vector-icons";
import {
  router,
} from "expo-router";

import {
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  loginAccount,
  requestAccountVerification,
} from "@/services/account-client";

import {
  getBiometricAvailability,
  setBiometricLoginEnabled,
} from "@/services/biometric-auth-service";

import {
  useAppSettings,
} from "@/providers/app-settings-provider";

import {
  universeTheme,
} from "@/theme/universe-theme";

import {
  StarBackground,
} from "@/components/universe-ui/star-background";

type AccountMode =
  | "login"
  | "register";

export default function AccountScreen() {
  const {
    settings,
    updateSettings,
  } = useAppSettings();

  const [
    mode,
    setMode,
  ] = useState<AccountMode>(
    "login",
  );

  const [
    username,
    setUsername,
  ] = useState(
    settings.account.username,
  );

  const [
    email,
    setEmail,
  ] = useState(
    settings.account.email,
  );

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    isSubmitting,
    setSubmitting,
  ] = useState(false);

  const isLogin =
    mode === "login";

  async function handleSubmit() {
    if (
      !email.trim() ||
      !password
    ) {
      Alert.alert(
        "Angaben unvollständig",
        "Gib deine E-Mail-Adresse und dein Passwort ein.",
      );

      return;
    }

    if (!isLogin) {
      if (!username.trim()) {
        Alert.alert(
          "Name fehlt",
          "Gib einen Namen für dein SaveWise-Konto ein.",
        );

        return;
      }

      if (password.length < 10) {
        Alert.alert(
          "Passwort zu kurz",
          "Das Passwort muss mindestens 10 Zeichen lang sein.",
        );

        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        Alert.alert(
          "Passwörter stimmen nicht überein",
          "Kontrolliere die beiden Passworteingaben.",
        );

        return;
      }
    }

    setSubmitting(true);

    try {
      if (isLogin) {
        const account =
          await loginAccount(
            email.trim(),
            password,
          );

        await updateSettings(
          (current) => ({
            ...current,

            account: {
              ...current.account,
              username:
                account.username,
              email:
                account.email,
              hasPassword: true,
            },
          }),
        );

        setPassword("");

        const biometric =
          await getBiometricAvailability();

        if (biometric.available) {
          Alert.alert(
            `${biometric.label} aktivieren?`,
            `Du kannst SaveWise künftig mit ${biometric.label} entsperren. Dein Passwort bleibt weiterhin für die serverseitige Anmeldung gültig.`,
            [
              {
                text: "Später",
                style: "cancel",

                onPress: () => {
                  router.replace(
                    "/(tabs)" as never,
                  );
                },
              },

              {
                text: "Aktivieren",

                onPress: () => {
                  void setBiometricLoginEnabled(
                    true,
                  ).then(() => {
                    router.replace(
                      "/(tabs)" as never,
                    );
                  });
                },
              },
            ],
          );
        } else {
          Alert.alert(
            "Willkommen zurück",
            `Du bist als ${account.username} angemeldet.`,
            [
              {
                text: "Zum Universum",

                onPress: () => {
                  router.replace(
                    "/(tabs)" as never,
                  );
                },
              },
            ],
          );
        }

        return;
      }

      const result =
        await requestAccountVerification({
          username:
            username.trim(),

          email:
            email.trim(),

          newPassword:
            password,
        });

      await updateSettings(
        (current) => ({
          ...current,

          account: {
            ...current.account,

            username:
              username.trim(),

            email:
              email.trim(),

            hasPassword:
              false,
          },
        }),
      );

      setPassword("");
      setConfirmPassword("");

      const developmentUrl =
        result.developmentVerificationUrl;

      Alert.alert(
        "Bestätigungs-E-Mail versendet",
        developmentUrl
          ? "Im Entwicklungsmodus kannst du den Bestätigungslink direkt öffnen."
          : "Öffne deine E-Mail und bestätige dein SaveWise-Konto.",
        [
          {
            text: "Schließen",
            style: "cancel",
          },

          ...(developmentUrl
            ? [
                {
                  text:
                    "Bestätigungslink öffnen",

                  onPress: () => {
                    void Linking.openURL(
                      developmentUrl,
                    );
                  },
                },
              ]
            : []),
        ],
      );

      setMode("login");
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : "ACCOUNT_FAILED";

      Alert.alert(
        isLogin
          ? "Anmeldung fehlgeschlagen"
          : "Registrierung fehlgeschlagen",
        getAccountErrorMessage(
          code,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      style={styles.screen}
    >
      <StarBackground density={75} />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={
            styles.topBar
          }
        >
          <Pressable
            accessibilityLabel="Zurück"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              router.back();
            }}
            style={({ pressed }) => [
              styles.closeButton,

              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .textSecondary
              }
              name="close"
              size={22}
            />
          </Pressable>
        </View>

        <View
          style={
            styles.brandBlock
          }
        >
          <View
            style={
              styles.brandIcon
            }
          >
            <Text
              style={
                styles.brandIconText
              }
            >
              S
            </Text>
          </View>

          <Text
            style={
              styles.brandName
            }
          >
            SaveWise
          </Text>

          <Text
            style={
              styles.brandSubtitle
            }
          >
            Dein persönliches
            Wissensuniversum
          </Text>
        </View>

        <View
          style={
            styles.modeSelector
          }
        >
          <ModeButton
            active={isLogin}
            label="Anmelden"
            onPress={() => {
              setMode("login");
            }}
          />

          <ModeButton
            active={!isLogin}
            label="Konto erstellen"
            onPress={() => {
              setMode("register");
            }}
          />
        </View>

        <View
          style={
            styles.card
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            {isLogin
              ? "WILLKOMMEN ZURÜCK"
              : "NEUES SAVEWISE-KONTO"}
          </Text>

          <Text
            style={
              styles.title
            }
          >
            {isLogin
              ? "Anmelden"
              : "Konto erstellen"}
          </Text>

          <Text
            style={
              styles.description
            }
          >
            {isLogin
              ? "Öffne dein persönliches Wissensuniversum und deine Workspaces."
              : "Erstelle ein Konto für Synchronisation, Workspaces und spätere Gerätewechsel."}
          </Text>

          {!isLogin ? (
            <AccountField
              autoCapitalize="words"
              icon="person-outline"
              label="Name"
              onChangeText={
                setUsername
              }
              placeholder="Fernando"
              value={username}
            />
          ) : null}

          <AccountField
            autoCapitalize="none"
            icon="mail-outline"
            keyboardType="email-address"
            label="E-Mail"
            onChangeText={setEmail}
            placeholder="name@beispiel.ch"
            value={email}
          />

          <AccountField
            autoCapitalize="none"
            icon="lock-closed-outline"
            label="Passwort"
            onChangeText={setPassword}
            placeholder={
              isLogin
                ? "Dein Passwort"
                : "Mindestens 10 Zeichen"
            }
            secureTextEntry
            value={password}
          />

          {!isLogin ? (
            <AccountField
              autoCapitalize="none"
              icon="checkmark-done-outline"
              label="Passwort bestätigen"
              onChangeText={
                setConfirmPassword
              }
              placeholder="Passwort wiederholen"
              secureTextEntry
              value={confirmPassword}
            />
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => {
              void handleSubmit();
            }}
            style={({ pressed }) => [
              styles.primaryButton,

              pressed &&
                styles.pressed,

              isSubmitting &&
                styles.disabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator
                color="#03111E"
                size="small"
              />
            ) : (
              <Ionicons
                color="#03111E"
                name={
                  isLogin
                    ? "log-in-outline"
                    : "person-add-outline"
                }
                size={19}
              />
            )}

            <Text
              style={
                styles.primaryButtonText
              }
            >
              {isSubmitting
                ? "Bitte warten …"
                : isLogin
                  ? "Anmelden"
                  : "Konto erstellen"}
            </Text>
          </Pressable>

          {isLogin ? (
            <View
              style={
                styles.biometricPreview
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .textMuted
                }
                name="scan-outline"
                size={20}
              />

              <View
                style={
                  styles.biometricText
                }
              >
                <Text
                  style={
                    styles.biometricTitle
                  }
                >
                  Face ID
                </Text>

                <Text
                  style={
                    styles.biometricDescription
                  }
                >
                  Wird im nächsten Schritt
                  als schnelle Anmeldung
                  aktiviert.
                </Text>
              </View>

              <View
                style={
                  styles.soonBadge
                }
              >
                <Text
                  style={
                    styles.soonText
                  }
                >
                  BALD
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <Text
          style={
            styles.footerText
          }
        >
          Deine Sitzung wird verschlüsselt
          im sicheren Speicher deines Geräts
          abgelegt.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,

        active &&
          styles.modeButtonActive,

        pressed &&
          styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.modeButtonText,

          active &&
            styles.modeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AccountField({
  icon,
  label,
  ...inputProps
}: React.ComponentProps<
  typeof TextInput
> & {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View
      style={
        styles.field
      }
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <View
        style={
          styles.inputWrapper
        }
      >
        <Ionicons
          color={
            universeTheme.colors
              .primaryBright
          }
          name={icon}
          size={18}
        />

        <TextInput
          placeholderTextColor={
            universeTheme.colors
              .textMuted
          }
          selectionColor={
            universeTheme.colors
              .primaryBright
          }
          style={
            styles.input
          }
          {...inputProps}
        />
      </View>
    </View>
  );
}

function getAccountErrorMessage(
  code: string,
): string {
  switch (code) {
    case "EMAIL_NOT_VERIFIED":
      return "Bestätige zuerst deine E-Mail-Adresse.";

    case "LOGIN_INVALID":
      return "E-Mail-Adresse oder Passwort ist nicht korrekt.";

    case "OLD_PASSWORD_REQUIRED":
      return "Für dieses Konto ist das bisherige Passwort erforderlich.";

    case "OLD_PASSWORD_INVALID":
      return "Das bisherige Passwort ist nicht korrekt.";

    case "ACCOUNT_INPUT_INVALID":
      return "Die eingegebenen Kontodaten sind ungültig.";

    default:
      return "Die Kontoaktion konnte nicht abgeschlossen werden.";
  }
}

const styles =
  StyleSheet.create({
    screen: {
      backgroundColor:
        universeTheme.colors
          .background,
      flex: 1,
    },

    content: {
      flexGrow: 1,
      paddingBottom: 45,
      paddingHorizontal: 18,
      paddingTop: 14,
    },

    topBar: {
      alignItems: "flex-end",
      minHeight: 44,
    },

    closeButton: {
      alignItems: "center",
      backgroundColor:
        "rgba(148, 163, 184, 0.08)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      height: 40,
      justifyContent: "center",
      width: 40,
    },

    brandBlock: {
      alignItems: "center",
      marginTop: 7,
    },

    brandIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.13)",
      borderColor:
        universeTheme.colors
          .primaryBright,
      borderRadius: 22,
      borderWidth: 1.5,
      height: 70,
      justifyContent: "center",
      shadowColor:
        universeTheme.colors
          .primary,
      shadowOffset: {
        height: 0,
        width: 0,
      },
      shadowOpacity: 0.6,
      shadowRadius: 22,
      width: 70,
    },

    brandIconText: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 29,
      fontWeight: "900",
    },

    brandName: {
      color:
        universeTheme.colors
          .text,
      fontSize: 28,
      fontWeight: "900",
      marginTop: 14,
    },

    brandSubtitle: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 12,
      marginTop: 4,
    },

    modeSelector: {
      backgroundColor:
        "rgba(7, 17, 31, 0.82)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
      marginTop: 25,
      padding: 4,
    },

    modeButton: {
      alignItems: "center",
      borderRadius: 11,
      flex: 1,
      justifyContent: "center",
      minHeight: 42,
    },

    modeButtonActive: {
      backgroundColor:
        "rgba(56, 189, 248, 0.14)",
    },

    modeButtonText: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 11,
      fontWeight: "800",
    },

    modeButtonTextActive: {
      color:
        universeTheme.colors
          .primaryBright,
    },

    card: {
      backgroundColor:
        "rgba(6, 20, 36, 0.94)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 22,
      borderWidth: 1,
      marginTop: 14,
      padding: 18,
    },

    eyebrow: {
      color:
        universeTheme.colors
          .primary,
      fontSize: 8,
      fontWeight: "900",
      letterSpacing: 1.2,
    },

    title: {
      color:
        universeTheme.colors
          .text,
      fontSize: 23,
      fontWeight: "900",
      marginTop: 4,
    },

    description: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 11,
      lineHeight: 17,
      marginBottom: 18,
      marginTop: 7,
    },

    field: {
      marginBottom: 13,
    },

    fieldLabel: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      fontWeight: "800",
      marginBottom: 7,
    },

    inputWrapper: {
      alignItems: "center",
      backgroundColor:
        "rgba(3, 12, 24, 0.72)",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 15,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      minHeight: 52,
      paddingHorizontal: 13,
    },

    input: {
      color:
        universeTheme.colors
          .text,
      flex: 1,
      fontSize: 13,
      minHeight: 50,
      paddingVertical: 12,
    },

    primaryButton: {
      alignItems: "center",
      backgroundColor:
        universeTheme.colors
          .primaryBright,
      borderRadius: 15,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      marginTop: 5,
      minHeight: 52,
      shadowColor:
        universeTheme.colors
          .primary,
      shadowOffset: {
        height: 0,
        width: 0,
      },
      shadowOpacity: 0.38,
      shadowRadius: 14,
    },

    primaryButtonText: {
      color: "#03111E",
      fontSize: 13,
      fontWeight: "900",
    },

    biometricPreview: {
      alignItems: "center",
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      marginTop: 16,
      padding: 12,
    },

    biometricText: {
      flex: 1,
    },

    biometricTitle: {
      color:
        universeTheme.colors
          .text,
      fontSize: 11,
      fontWeight: "900",
    },

    biometricDescription: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 8,
      lineHeight: 13,
      marginTop: 3,
    },

    soonBadge: {
      borderColor:
        universeTheme.colors
          .border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },

    soonText: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 7,
      fontWeight: "900",
    },

    footerText: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 17,
      textAlign: "center",
    },

    pressed: {
      opacity: 0.67,
    },

    disabled: {
      opacity: 0.45,
    },
  });
