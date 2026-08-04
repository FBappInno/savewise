import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppSettings } from "@/providers/app-settings-provider";
import { StorageSettingsPanel } from "@/components/settings/storage-settings-panel";
import { formatAppDateTime } from "@/i18n/date-time";
import { getKnowledgeLibrary } from "@/services/content-import-client";
import { theme } from "@/theme";
import { deleteMyAnonymousAnalytics } from "@/services/anonymous-analytics";
import { loginAccount, requestAccountVerification } from "@/services/account-client";
import type {
  DisplayLanguage,
  DateFormat,
  InputLanguage,
  TimeFormat,
} from "@/types/app-settings";

export default function SettingsScreen() {
  const { locale, settings, t, updateSettings } = useAppSettings();
  const [username, setUsername] = useState(settings.account.username);
  const [email, setEmail] = useState(settings.account.email);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSaving, setSaving] = useState(false);
  const [lastKnowledgeUpdate, setLastKnowledgeUpdate] = useState<string | null>(null);
  const [isDeletingAnalytics, setDeletingAnalytics] = useState(false);

  useEffect(() => {
    setUsername(settings.account.username);
    setEmail(settings.account.email);
  }, [settings.account.email, settings.account.username]);

  useEffect(() => {
    void getKnowledgeLibrary()
      .then((library) => setLastKnowledgeUpdate(library.graph?.generatedAt ?? library.generatedAt))
      .catch(() => setLastKnowledgeUpdate(null));
  }, []);

  async function handleSaveAccount() {
    if (!username.trim() || !email.trim() || newPassword.length < 10) {
      Alert.alert(t("accountAuth.invalidInput"), t("accountAuth.passwordRequirements"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("accountAuth.passwordMismatch"), t("accountAuth.passwordMismatchDescription"));
      return;
    }
    setSaving(true);
    try {
      await requestAccountVerification({
        username: username.trim(),
        email: email.trim(),
        ...(oldPassword ? { oldPassword } : {}),
        newPassword,
      });
      await updateSettings((current) => ({
        ...current,
        account: { ...current.account, username: username.trim(), email: email.trim() },
      }));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert(t("accountAuth.emailSent"), t("accountAuth.emailSentDescription"));
    } catch (error) {
      const code = error instanceof Error ? error.message : "ACCOUNT_UPDATE_FAILED";
      Alert.alert(
        t("accountAuth.updateFailed"),
        code === "OLD_PASSWORD_REQUIRED" || code === "OLD_PASSWORD_INVALID"
          ? t("accountAuth.oldPasswordInvalid")
          : t("accountAuth.updateFailedDescription"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyticsChange(usageAnalytics: boolean) {
    await updateSettings((current) => ({
      ...current,
      privacy: {
        ...current.privacy,
        analyticsConsent: usageAnalytics ? "granted" : "denied",
        usageAnalytics,
      },
    }));
  }

  async function handleLogin() {
    if (!email.trim() || !loginPassword) return;
    setSaving(true);
    try {
      await loginAccount(email.trim(), loginPassword);
      setLoginPassword("");
      Alert.alert(t("accountAuth.loginSuccess"), t("accountAuth.loginSuccessDescription"));
    } catch {
      Alert.alert(t("accountAuth.loginFailed"), t("accountAuth.loginFailedDescription"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAnalytics() {
    setDeletingAnalytics(true);
    try {
      const deletedEvents = await deleteMyAnonymousAnalytics();
      await updateSettings((current) => ({
        ...current,
        privacy: { ...current.privacy, analyticsConsent: "denied", usageAnalytics: false },
      }));
      Alert.alert(
        t("settings.analyticsDeleted"),
        t("settings.analyticsDeletedDescription", { count: deletedEvents }),
      );
    } catch {
      Alert.alert(t("settings.analyticsDeleteFailed"), t("settings.analyticsDeleteFailedDescription"));
    } finally {
      setDeletingAnalytics(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t("settings.eyebrow")}</Text>
          <Text style={styles.title}>{t("settings.title")}</Text>
          <Text style={styles.subtitle}>{t("settings.subtitle")}</Text>
        </View>

        <SettingsSection
          description={t("settings.accountDescription")}
          icon="person-circle-outline"
          title={t("settings.account")}
        >
          <Field
            autoCapitalize="words"
            label={t("settings.username")}
            onChangeText={setUsername}
            value={username}
          />
          <Field
            autoCapitalize="none"
            keyboardType="email-address"
            label={t("settings.email")}
            onChangeText={setEmail}
            value={email}
          />
          <Field
            autoCapitalize="none"
            label={t("accountAuth.oldPassword")}
            onChangeText={setOldPassword}
            placeholder={t("accountAuth.oldPasswordOptional")}
            secureTextEntry
            value={oldPassword}
          />
          <Field
            autoCapitalize="none"
            label={t("accountAuth.newPassword")}
            onChangeText={setNewPassword}
            placeholder={t("accountAuth.passwordRequirements")}
            secureTextEntry
            value={newPassword}
          />
          <Field
            autoCapitalize="none"
            label={t("accountAuth.confirmPassword")}
            onChangeText={setConfirmPassword}
            secureTextEntry
            value={confirmPassword}
          />
          <Pressable
            disabled={isSaving}
            onPress={() => void handleSaveAccount()}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
              isSaving && styles.disabled,
            ]}
          >
            <Ionicons color="#ffffff" name="save-outline" size={18} />
            <Text style={styles.saveButtonText}>{t("settings.saveAccount")}</Text>
          </Pressable>
          <View style={styles.accountDivider} />
          <Text style={styles.controlLabel}>{t("accountAuth.existingAccount")}</Text>
          <Field
            autoCapitalize="none"
            label={t("settings.password")}
            onChangeText={setLoginPassword}
            secureTextEntry
            value={loginPassword}
          />
          <Pressable
            disabled={isSaving || !email.trim() || !loginPassword}
            onPress={() => void handleLogin()}
            style={({ pressed }) => [styles.loginButton, pressed && styles.pressed, isSaving && styles.disabled]}
          >
            <Text style={styles.loginButtonText}>{t("accountAuth.login")}</Text>
          </Pressable>
        </SettingsSection>

        <SettingsSection
          description={t("settings.languageDescription")}
          icon="language-outline"
          title={t("settings.language")}
        >
          <DropdownSelect<DisplayLanguage>
            label={t("settings.displayLanguage")}
            onChange={(display) => void updateSettings((current) => ({
              ...current,
              language: { ...current.language, display },
            }))}
            options={[
              { label: t("settings.system"), value: "system" },
              { label: t("settings.german"), value: "de" },
              { label: t("settings.english"), value: "en" },
              { label: t("settings.french"), value: "fr" },
              { label: t("settings.italian"), value: "it" },
              { label: t("settings.spanish"), value: "es" },
            ]}
            value={settings.language.display}
          />
          <DropdownSelect<InputLanguage>
            label={t("settings.inputLanguage")}
            onChange={(input) => void updateSettings((current) => ({
              ...current,
              language: { ...current.language, input },
            }))}
            options={[
              { label: t("settings.automatic"), value: "auto" },
              { label: t("settings.german"), value: "de" },
              { label: t("settings.english"), value: "en" },
              { label: t("settings.french"), value: "fr" },
              { label: t("settings.italian"), value: "it" },
              { label: t("settings.spanish"), value: "es" },
            ]}
            value={settings.language.input}
          />
        </SettingsSection>

        <SettingsSection
          description={t("settings.dateTimeDescription")}
          icon="calendar-outline"
          title={t("settings.dateTime")}
        >
          <DropdownSelect<DateFormat>
            label={t("settings.dateFormat")}
            onChange={(dateFormat) => void updateSettings((current) => ({
              ...current,
              dateTime: { ...current.dateTime, dateFormat },
            }))}
            options={[
              { label: t("settings.dateDayMonthYear"), value: "day-month-year" },
              { label: t("settings.dateMonthDayYear"), value: "month-day-year" },
              { label: t("settings.dateYearMonthDay"), value: "year-month-day" },
            ]}
            value={settings.dateTime.dateFormat}
          />
          <DropdownSelect<TimeFormat>
            label={t("settings.timeFormat")}
            onChange={(timeFormat) => void updateSettings((current) => ({
              ...current,
              dateTime: { ...current.dateTime, timeFormat },
            }))}
            options={[
              { label: t("settings.system"), value: "system" },
              { label: t("settings.time24Hour"), value: "24-hour" },
              { label: t("settings.time12Hour"), value: "12-hour" },
            ]}
            value={settings.dateTime.timeFormat}
          />
        </SettingsSection>

        <SettingsSection
          description={t("settings.storageDescription")}
          icon="server-outline"
          title={t("settings.storage")}
        >
          <StorageSettingsPanel />
        </SettingsSection>

        <SettingsSection icon="shield-checkmark-outline" title={t("settings.privacy")}>
          <ToggleRow
            description={t("settings.analyticsDescription")}
            label={t("settings.analytics")}
            onValueChange={(usageAnalytics) => void handleAnalyticsChange(usageAnalytics)}
            value={settings.privacy.usageAnalytics}
          />
          <View style={styles.analyticsFacts}>
            <Text style={styles.analyticsFact}>• {t("settings.analyticsNoContent")}</Text>
            <Text style={styles.analyticsFact}>• {t("settings.analyticsTechnicalOnly")}</Text>
            <Text style={styles.analyticsFact}>• {t("settings.analyticsRetention")}</Text>
          </View>
          <Pressable
            disabled={isDeletingAnalytics}
            onPress={() => void handleDeleteAnalytics()}
            style={({ pressed }) => [styles.deleteAnalyticsButton, pressed && styles.pressed, isDeletingAnalytics && styles.disabled]}
          >
            <Ionicons color="#B42318" name="trash-outline" size={17} />
            <Text style={styles.deleteAnalyticsText}>
              {isDeletingAnalytics ? t("settings.analyticsDeleting") : t("settings.analyticsDelete")}
            </Text>
          </Pressable>
          <ToggleRow
            description={t("settings.externalProcessingDescription")}
            label={t("settings.externalProcessing")}
            onValueChange={(externalContentProcessing) => void updateSettings((current) => ({
              ...current,
              privacy: { ...current.privacy, externalContentProcessing },
            }))}
            value={settings.privacy.externalContentProcessing}
          />
        </SettingsSection>

        <SettingsSection
          description={t("settings.aiDescription")}
          icon="sparkles-outline"
          title={t("settings.ai")}
        >
          <ToggleRow
            label={t("settings.contentAnalysis")}
            onValueChange={(contentAnalysis) => void updateSettings((current) => ({
              ...current,
              ai: { ...current.ai, contentAnalysis },
            }))}
            value={settings.ai.contentAnalysis}
          />
          <ToggleRow
            label={t("settings.knowledgeGraph")}
            onValueChange={(knowledgeGraph) => void updateSettings((current) => ({
              ...current,
              ai: { ...current.ai, knowledgeGraph },
            }))}
            value={settings.ai.knowledgeGraph}
          />
          <ToggleRow
            label={t("settings.autonomousResearch")}
            onValueChange={(autonomousResearch) => void updateSettings((current) => ({
              ...current,
              ai: { ...current.ai, autonomousResearch },
            }))}
            value={settings.ai.autonomousResearch}
          />
        </SettingsSection>

        <SettingsSection icon="information-circle-outline" title={t("settings.appVersion")}>
          <InfoRow
            label={t("settings.appVersion")}
            value={Constants.expoConfig?.version ?? "1.0.0"}
          />
          <InfoRow
            label={t("settings.lastUpdate")}
            value={lastKnowledgeUpdate
              ? formatAppDateTime(
                lastKnowledgeUpdate,
                locale,
                settings.dateTime.dateFormat,
                settings.dateTime.timeFormat,
              )
              : t("settings.unavailable")}
          />
        </SettingsSection>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SettingsSection({ children, description, icon, title }: {
  children: ReactNode;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionIcon}>
          <Ionicons color={theme.colors.primary} name={icon} size={20} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.placeholder}
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
}

function DropdownSelect<T extends string>({ label, onChange, options, value }: {
  label: string;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  value: T;
}) {
  const [isOpen, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <View style={styles.dropdownGroup}>
      <Text style={styles.controlLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.dropdown, pressed && styles.pressed]}
      >
        <Text style={styles.dropdownValue}>{selectedLabel}</Text>
        <Ionicons color={theme.colors.textSecondary} name="chevron-down" size={20} />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={isOpen}
      >
        <Pressable onPress={() => setOpen(false)} style={styles.modalBackdrop}>
          <Pressable onPress={() => undefined} style={styles.optionSheet}>
            <View style={styles.optionSheetHeader}>
              <Text style={styles.optionSheetTitle}>{label}</Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => setOpen(false)}
              >
                <Ionicons color={theme.colors.textSecondary} name="close" size={24} />
              </Pressable>
            </View>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    selected && styles.dropdownOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    selected && styles.dropdownOptionTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons color={theme.colors.primary} name="checkmark-circle" size={22} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ToggleRow({ description, label, onValueChange, value }: {
  description?: string;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDescription}>{description}</Text> : null}
      </View>
      <Switch
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingBottom: 110, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.xxxl + theme.spacing.sm },
  header: { marginBottom: theme.spacing.xxl },
  eyebrow: { ...theme.typography.caption, color: theme.colors.primary, letterSpacing: 1.1 },
  title: { ...theme.typography.screenTitle, color: theme.colors.text, marginTop: theme.spacing.sm },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  section: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.lg, borderWidth: 1, marginBottom: theme.spacing.lg, padding: theme.spacing.lg },
  sectionTitleRow: { alignItems: "center", flexDirection: "row", gap: theme.spacing.md },
  sectionIcon: { alignItems: "center", backgroundColor: "#EFF6FF", borderRadius: theme.radius.md, height: 38, justifyContent: "center", width: 38 },
  sectionTitle: { ...theme.typography.sectionTitle, color: theme.colors.text, flex: 1 },
  sectionDescription: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: theme.spacing.md },
  sectionBody: { marginTop: theme.spacing.lg },
  field: { marginBottom: theme.spacing.md },
  fieldLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  input: { ...theme.typography.body, backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, color: theme.colors.text, minHeight: 48, paddingHorizontal: theme.spacing.md },
  saveButton: { alignItems: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.sm, justifyContent: "center", minHeight: 50, marginTop: theme.spacing.xs },
  saveButtonText: { ...theme.typography.button, color: "#ffffff" },
  accountDivider: { backgroundColor: theme.colors.border, height: StyleSheet.hairlineWidth, marginVertical: theme.spacing.lg },
  loginButton: { alignItems: "center", borderColor: theme.colors.primary, borderRadius: theme.radius.md, borderWidth: 1, justifyContent: "center", minHeight: 48 },
  loginButtonText: { ...theme.typography.button, color: theme.colors.primary },
  controlLabel: { ...theme.typography.bodyStrong, color: theme.colors.text },
  dropdownGroup: { marginBottom: theme.spacing.lg },
  dropdown: { alignItems: "center", backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.sm, minHeight: 50, paddingHorizontal: theme.spacing.md },
  dropdownValue: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  modalBackdrop: { backgroundColor: "rgba(17, 24, 39, 0.42)", flex: 1, justifyContent: "flex-end", padding: theme.spacing.lg },
  optionSheet: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.lg },
  optionSheetHeader: { alignItems: "center", borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingBottom: theme.spacing.md },
  optionSheetTitle: { ...theme.typography.sectionTitle, color: theme.colors.text, flex: 1 },
  dropdownOption: { alignItems: "center", borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 52, paddingHorizontal: theme.spacing.sm },
  dropdownOptionSelected: { backgroundColor: "#EFF6FF" },
  dropdownOptionText: { ...theme.typography.body, color: theme.colors.text },
  dropdownOptionTextSelected: { color: theme.colors.primary, fontWeight: "600" },
  toggleRow: { alignItems: "center", borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: theme.spacing.md, minHeight: 62, paddingVertical: theme.spacing.sm },
  toggleText: { flex: 1 },
  toggleLabel: { ...theme.typography.bodyStrong, color: theme.colors.text },
  toggleDescription: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  analyticsFacts: { backgroundColor: theme.colors.background, borderRadius: theme.radius.md, gap: theme.spacing.xs, marginTop: theme.spacing.sm, padding: theme.spacing.md },
  analyticsFact: { ...theme.typography.caption, color: theme.colors.textSecondary },
  deleteAnalyticsButton: { alignItems: "center", borderColor: "#FECACA", borderRadius: theme.radius.md, borderWidth: 1, flexDirection: "row", gap: theme.spacing.sm, justifyContent: "center", marginTop: theme.spacing.md, minHeight: 46 },
  deleteAnalyticsText: { ...theme.typography.button, color: "#B42318" },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.7 },
  infoRow: { alignItems: "center", borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: theme.spacing.md, justifyContent: "space-between", minHeight: 48 },
  infoLabel: { ...theme.typography.body, color: theme.colors.textSecondary },
  infoValue: { ...theme.typography.bodyStrong, color: theme.colors.text, flex: 1, textAlign: "right" },
});
