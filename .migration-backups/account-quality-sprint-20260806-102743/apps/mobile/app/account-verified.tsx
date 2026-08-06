import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppSettings } from "@/providers/app-settings-provider";
import { loginAccount, markLoginRequired } from "@/services/account-client";
import { theme } from "@/theme";

export default function AccountVerifiedScreen() {
  const { settings, t } = useAppSettings();
  const [email, setEmail] = useState(settings.account.email);
  const [password, setPassword] = useState("");
  const [isLoggingIn, setLoggingIn] = useState(false);

  useEffect(() => { void markLoginRequired(); }, []);

  async function login() {
    setLoggingIn(true);
    try {
      await loginAccount(email, password);
      router.replace("/(tabs)/settings");
    } catch {
      Alert.alert(t("accountAuth.loginFailed"), t("accountAuth.loginFailedDescription"));
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>{t("accountAuth.verified")}</Text>
      <Text style={styles.title}>{t("accountAuth.loginTitle")}</Text>
      <Text style={styles.description}>{t("accountAuth.loginDescription")}</Text>
      <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder={t("settings.email")} style={styles.input} value={email} />
      <TextInput onChangeText={setPassword} placeholder={t("settings.password")} secureTextEntry style={styles.input} value={password} />
      <Pressable disabled={isLoggingIn || !email || !password} onPress={() => void login()} style={styles.button}>
        <Text style={styles.buttonText}>{isLoggingIn ? t("accountAuth.loggingIn") : t("accountAuth.login")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.background, flex: 1, justifyContent: "center", padding: theme.spacing.xl },
  eyebrow: { ...theme.typography.caption, color: theme.colors.primary, letterSpacing: 1 },
  title: { ...theme.typography.screenTitle, color: theme.colors.text, marginTop: theme.spacing.sm },
  description: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.xl, marginTop: theme.spacing.sm },
  input: { ...theme.typography.body, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, color: theme.colors.text, marginBottom: theme.spacing.md, minHeight: 50, paddingHorizontal: theme.spacing.md },
  button: { alignItems: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, justifyContent: "center", minHeight: 50 },
  buttonText: { ...theme.typography.button, color: "#ffffff" },
});
