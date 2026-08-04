import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppSettings } from "@/providers/app-settings-provider";
import { trackAnonymousEvent } from "@/services/anonymous-analytics";
import { theme } from "@/theme";

export function AnalyticsConsentModal() {
  const { isReady, settings, t, updateSettings } = useAppSettings();
  const visible = isReady && settings.privacy.analyticsConsent === "undecided";

  async function decide(granted: boolean) {
    await updateSettings((current) => ({
      ...current,
      privacy: {
        ...current.privacy,
        analyticsConsent: granted ? "granted" : "denied",
        usageAnalytics: granted,
      },
    }));
    if (granted) await trackAnonymousEvent("AppStart", { operation: "app" });
  }

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.icon}>
            <Ionicons color={theme.colors.primary} name="shield-checkmark-outline" size={28} />
          </View>
          <Text style={styles.title}>{t("analyticsConsent.title")}</Text>
          <Text style={styles.description}>{t("analyticsConsent.description")}</Text>
          <ConsentPoint text={t("analyticsConsent.noContent")} />
          <ConsentPoint text={t("analyticsConsent.noUrls")} />
          <ConsentPoint text={t("analyticsConsent.technicalOnly")} />
          <Pressable onPress={() => void decide(true)} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{t("analyticsConsent.accept")}</Text>
          </Pressable>
          <Pressable onPress={() => void decide(false)} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{t("analyticsConsent.notNow")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ConsentPoint({ text }: { text: string }) {
  return (
    <View style={styles.point}>
      <Ionicons color={theme.colors.primary} name="checkmark-circle-outline" size={19} />
      <Text style={styles.pointText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(17, 24, 39, 0.5)", flex: 1, justifyContent: "center", padding: theme.spacing.xl },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.xl },
  icon: { alignItems: "center", alignSelf: "center", backgroundColor: "#EFF6FF", borderRadius: 28, height: 56, justifyContent: "center", width: 56 },
  title: { ...theme.typography.sectionTitle, color: theme.colors.text, marginTop: theme.spacing.lg, textAlign: "center" },
  description: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg, marginTop: theme.spacing.sm, textAlign: "center" },
  point: { alignItems: "center", flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  pointText: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  primaryButton: { alignItems: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, justifyContent: "center", marginTop: theme.spacing.lg, minHeight: 50 },
  primaryText: { ...theme.typography.button, color: "#ffffff" },
  secondaryButton: { alignItems: "center", justifyContent: "center", minHeight: 48 },
  secondaryText: { ...theme.typography.button, color: theme.colors.textSecondary },
});
