import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppSettings } from "@/providers/app-settings-provider";
import {
  describeStorageTarget,
  storageProviderDefinitions,
} from "@/services/storage/storage-provider-registry";
import { theme } from "@/theme";
import {
  deleteWebDavCredentials,
  loadWebDavCredentials,
  saveWebDavCredentials,
} from "@/services/storage/webdav-credentials";
import {
  syncWithWebDav,
  testWebDavConnection,
} from "@/services/storage/webdav-sync-service";
import { deleteDropboxSession, loadDropboxSession } from "@/services/storage/dropbox-credentials";
import {
  connectDropbox,
  disconnectDropbox,
  getDropboxAppKey,
  getDropboxRedirectUri,
  syncWithDropbox,
} from "@/services/storage/dropbox-sync-service";
import type {
  ExternalStorageProvider,
  StorageMode,
} from "@savewise/shared";
import { classifyAnonymousError, trackAnonymousEvent } from "@/services/anonymous-analytics";
import { hasVerifiedAccountSession } from "@/services/account-client";

const providerNames: Record<ExternalStorageProvider, string> = {
  dropbox: "Dropbox",
  "google-drive": "Google Drive",
  onedrive: "Microsoft OneDrive",
  "icloud-drive": "iCloud Drive",
  nextcloud: "Nextcloud",
  "synology-nas": "Synology NAS",
  webdav: "WebDAV",
};

export function StorageSettingsPanel() {
  const { settings, t, updateSettings } = useAppSettings();
  const [providersOpen, setProvidersOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isConnecting, setConnecting] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const [dropboxAccount, setDropboxAccount] = useState<string | null>(null);
  const storage = settings.storage;
  const target = describeStorageTarget(storage.preferredMode, storage.provider);
  const supportsWebDav = storage.provider === "webdav" ||
    storage.provider === "nextcloud" ||
    storage.provider === "synology-nas";
  const supportsDropbox = storage.provider === "dropbox";
  const dropboxAppKey = getDropboxAppKey();

  useEffect(() => {
    void loadWebDavCredentials().then((credentials) => {
      if (!credentials) return;
      setServerUrl(credentials.serverUrl);
      setUsername(credentials.username);
      setPassword(credentials.password);
    });
    void loadDropboxSession().then((session) => setDropboxAccount(session?.displayName ?? null));
  }, []);

  async function selectMode(preferredMode: StorageMode) {
    if (preferredMode !== "local" && !await hasVerifiedAccountSession()) {
      Alert.alert(t("accountAuth.cloudLoginRequired"), t("accountAuth.cloudLoginRequiredDescription"));
      return;
    }
    if (preferredMode === "local") {
      await deleteWebDavCredentials();
      await deleteDropboxSession();
      setPassword("");
    }
    await updateSettings((current) => ({
      ...current,
      storage: {
        ...current.storage,
        activeMode: "local",
        preferredMode,
        provider: preferredMode === "bring-your-own-cloud"
          ? current.storage.provider
          : null,
        syncEnabled: false,
        connectionStatus: preferredMode === "local" ? "local-only" : "connection-required",
      },
    }));
  }

  function selectProvider(provider: ExternalStorageProvider) {
    void updateSettings((current) => ({
      ...current,
      storage: {
        ...current.storage,
        activeMode: "local",
        preferredMode: "bring-your-own-cloud",
        provider,
        syncEnabled: false,
        connectionStatus: "connection-required",
      },
    }));
    setProvidersOpen(false);
  }

  async function connectWebDav() {
    if (!await hasVerifiedAccountSession()) {
      Alert.alert(t("accountAuth.cloudLoginRequired"), t("accountAuth.cloudLoginRequiredDescription"));
      return;
    }
    const credentials = {
      serverUrl: serverUrl.trim(),
      username: username.trim(),
      password,
    };
    if (!credentials.serverUrl || !credentials.username || !credentials.password) {
      Alert.alert(t("settings.storageConnectionFailed"), t("settings.storageCredentialsRequired"));
      return;
    }

    setConnecting(true);
    try {
      await testWebDavConnection(credentials);
      await saveWebDavCredentials(credentials);
      await updateSettings((current) => ({
        ...current,
        storage: {
          ...current.storage,
          activeMode: "bring-your-own-cloud",
          preferredMode: "bring-your-own-cloud",
          syncEnabled: true,
          connectionStatus: "connected",
        },
      }));
      Alert.alert(t("settings.storageConnected"), t("settings.storageConnectedDescription"));
    } catch (error) {
      await updateSettings((current) => ({
        ...current,
        storage: { ...current.storage, activeMode: "local", syncEnabled: false, connectionStatus: "error" },
      }));
      Alert.alert(
        t("settings.storageConnectionFailed"),
        error instanceof Error ? error.message : t("settings.storageConnectionFailed"),
      );
    } finally {
      setConnecting(false);
    }
  }

  async function syncNow() {
    if (!await hasVerifiedAccountSession()) {
      Alert.alert(t("accountAuth.cloudLoginRequired"), t("accountAuth.cloudLoginRequiredDescription"));
      return;
    }
    setSyncing(true);
    const startedAt = Date.now();
    void trackAnonymousEvent("SyncStarted", { operation: "cloud-sync" });
    try {
      const result = supportsDropbox && dropboxAppKey
        ? await syncWithDropbox(dropboxAppKey)
        : await syncWithWebDav({
            serverUrl: serverUrl.trim(),
            username: username.trim(),
            password,
          });
      await updateSettings((current) => ({
        ...current,
        storage: { ...current.storage, lastSyncAt: result.syncedAt, connectionStatus: "connected" },
      }));
      Alert.alert(
        t("settings.storageSyncComplete"),
        t("settings.storageSyncCompleteDescription", { count: result.uploadedDiscoveries }),
      );
      void trackAnonymousEvent("SyncFinished", {
        durationMs: Date.now() - startedAt,
        itemCount: result.uploadedDiscoveries,
        operation: "cloud-sync",
      });
    } catch (error) {
      void trackAnonymousEvent("SyncFailed", {
        durationMs: Date.now() - startedAt,
        operation: "cloud-sync",
        errorKind: classifyAnonymousError(error),
      });
      Alert.alert(
        t("settings.storageSyncFailed"),
        error instanceof Error ? error.message : t("settings.storageSyncFailed"),
      );
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (supportsDropbox && dropboxAppKey) {
      await disconnectDropbox(dropboxAppKey);
      setDropboxAccount(null);
    } else {
      await deleteWebDavCredentials();
    }
    setPassword("");
    await updateSettings((current) => ({
      ...current,
      storage: {
        ...current.storage,
        activeMode: "local",
        syncEnabled: false,
        connectionStatus: "connection-required",
        lastSyncAt: null,
      },
    }));
  }

  async function connectDropboxAccount() {
    if (!await hasVerifiedAccountSession()) {
      Alert.alert(t("accountAuth.cloudLoginRequired"), t("accountAuth.cloudLoginRequiredDescription"));
      return;
    }
    if (!dropboxAppKey) {
      Alert.alert(t("settings.storageDropboxSetupRequired"), t("settings.storageDropboxSetupDescription"));
      return;
    }
    setConnecting(true);
    try {
      const connection = await connectDropbox(dropboxAppKey);
      setDropboxAccount(connection.displayName);
      await updateSettings((current) => ({
        ...current,
        storage: {
          ...current.storage,
          activeMode: "bring-your-own-cloud",
          preferredMode: "bring-your-own-cloud",
          provider: "dropbox",
          syncEnabled: true,
          connectionStatus: "connected",
        },
      }));
      Alert.alert(t("settings.storageConnected"), t("settings.storageDropboxConnected", { name: connection.displayName }));
    } catch (error) {
      Alert.alert(
        t("settings.storageConnectionFailed"),
        error instanceof Error ? error.message : t("settings.storageConnectionFailed"),
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.activeBanner}>
        <Ionicons
          color={theme.colors.primary}
          name={storage.activeMode === "bring-your-own-cloud" ? "cloud-done-outline" : "phone-portrait-outline"}
          size={20}
        />
        <View style={styles.flex}>
          <Text style={styles.activeTitle}>
            {t(storage.activeMode === "bring-your-own-cloud"
              ? "settings.storageOwnCloud"
              : "settings.storageActiveLocal")}
          </Text>
          <Text style={styles.secondary}>
            {t(storage.activeMode === "bring-your-own-cloud"
              ? "settings.storageConnectedDescription"
              : "settings.storageLocalGuarantee")}
          </Text>
        </View>
      </View>

      <StorageModeCard
        description={t("settings.storageLocalDescription")}
        icon="phone-portrait-outline"
        onPress={() => void selectMode("local")}
        selected={storage.preferredMode === "local"}
        title={t("settings.storageLocal")}
      />
      <StorageModeCard
        badge={t("settings.storagePremium")}
        description={t("settings.storageOwnCloudDescription")}
        icon="cloud-outline"
        onPress={() => void selectMode("bring-your-own-cloud")}
        selected={storage.preferredMode === "bring-your-own-cloud"}
        title={t("settings.storageOwnCloud")}
      />

      {storage.preferredMode === "bring-your-own-cloud" ? (
        <View style={styles.providerArea}>
          <Text style={styles.label}>{t("settings.storageProvider")}</Text>
          <Pressable
            onPress={() => setProvidersOpen((open) => !open)}
            style={styles.providerSelect}
          >
            <Text style={styles.providerValue}>
              {storage.provider
                ? providerNames[storage.provider]
                : t("settings.storageChooseProvider")}
            </Text>
            <Ionicons
              color={theme.colors.textSecondary}
              name={providersOpen ? "chevron-up" : "chevron-down"}
              size={18}
            />
          </Pressable>
          {providersOpen ? (
            <View style={styles.providerList}>
              {storageProviderDefinitions.map((provider) => (
                <Pressable
                  key={provider.id}
                  onPress={() => selectProvider(provider.id)}
                  style={styles.providerOption}
                >
                  <Text style={styles.providerOptionText}>{providerNames[provider.id]}</Text>
                  {storage.provider === provider.id ? (
                    <Ionicons color={theme.colors.primary} name="checkmark" size={18} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={styles.connectionHint}>
            {supportsWebDav
              ? t("settings.storageWebDavReady")
              : supportsDropbox
                ? t("settings.storageDropboxReady")
                : t("settings.storageOAuthPrepared")}
          </Text>

          {supportsDropbox ? (
            <View style={styles.credentials}>
              {dropboxAppKey ? (
                <>
                  <View style={styles.oauthInfo}>
                    <Ionicons color={theme.colors.primary} name="logo-dropbox" size={22} />
                    <View style={styles.flex}>
                      <Text style={styles.modeTitle}>
                        {dropboxAccount ?? t("settings.storageDropboxNotConnected")}
                      </Text>
                      <Text selectable style={styles.secondary}>{getDropboxRedirectUri()}</Text>
                    </View>
                  </View>
                  {storage.connectionStatus === "connected" && storage.provider === "dropbox" ? (
                    <View style={styles.actionRow}>
                      <ActionButton
                        disabled={isSyncing}
                        label={isSyncing ? t("settings.storageSyncing") : t("settings.storageSyncNow")}
                        onPress={() => void syncNow()}
                        primary
                      />
                      <ActionButton label={t("settings.storageDisconnect")} onPress={() => void disconnect()} />
                    </View>
                  ) : (
                    <ActionButton
                      disabled={isConnecting}
                      label={isConnecting ? t("settings.storageConnecting") : t("settings.storageConnectDropbox")}
                      onPress={() => void connectDropboxAccount()}
                      primary
                    />
                  )}
                </>
              ) : (
                <View style={styles.setupBox}>
                  <Text style={styles.modeTitle}>{t("settings.storageDropboxSetupRequired")}</Text>
                  <Text style={styles.secondary}>{t("settings.storageDropboxSetupDescription")}</Text>
                  <Text selectable style={styles.codeText}>EXPO_PUBLIC_DROPBOX_APP_KEY</Text>
                  <Text selectable style={styles.codeText}>savewise://oauth/dropbox</Text>
                </View>
              )}
              {storage.lastSyncAt ? (
                <Text style={styles.lastSync}>{t("settings.storageLastSync")}: {new Date(storage.lastSyncAt).toLocaleString()}</Text>
              ) : null}
            </View>
          ) : null}

          {supportsWebDav ? (
            <View style={styles.credentials}>
              <CloudField
                autoCapitalize="none"
                keyboardType="url"
                label={t("settings.storageServerUrl")}
                onChangeText={setServerUrl}
                placeholder="https://cloud.example.com/remote.php/dav/files/name"
                value={serverUrl}
              />
              <CloudField
                autoCapitalize="none"
                label={t("settings.storageUsername")}
                onChangeText={setUsername}
                value={username}
              />
              <CloudField
                autoCapitalize="none"
                label={t("settings.storagePassword")}
                onChangeText={setPassword}
                secureTextEntry
                value={password}
              />
              {storage.connectionStatus === "connected" ? (
                <View style={styles.actionRow}>
                  <ActionButton
                    disabled={isSyncing}
                    label={isSyncing ? t("settings.storageSyncing") : t("settings.storageSyncNow")}
                    onPress={() => void syncNow()}
                    primary
                  />
                  <ActionButton
                    label={t("settings.storageDisconnect")}
                    onPress={() => void disconnect()}
                  />
                </View>
              ) : (
                <ActionButton
                  disabled={isConnecting}
                  label={isConnecting ? t("settings.storageConnecting") : t("settings.storageConnect")}
                  onPress={() => void connectWebDav()}
                  primary
                />
              )}
              {storage.lastSyncAt ? (
                <Text style={styles.lastSync}>{t("settings.storageLastSync")}: {new Date(storage.lastSyncAt).toLocaleString()}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <StorageModeCard
        badge={t("settings.storagePremiumPlus")}
        description={t("settings.storageSaveWiseDescription")}
        icon="sparkles-outline"
        onPress={() => void selectMode("savewise-cloud")}
        selected={storage.preferredMode === "savewise-cloud"}
        title={t("settings.storageSaveWiseCloud")}
      />

      {storage.preferredMode !== "local" && storage.connectionStatus !== "connected" ? (
        <View style={styles.pendingBanner}>
          <Ionicons color={theme.colors.textSecondary} name="construct-outline" size={18} />
          <Text style={styles.pendingText}>{t("settings.storagePendingActivation")}</Text>
        </View>
      ) : null}

      <View style={styles.pathRow}>
        <Text style={styles.pathLabel}>{t("settings.storageTargetPath")}</Text>
        <Text style={styles.pathValue}>{target.rootPath}</Text>
      </View>
    </View>
  );
}

function CloudField({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.colors.placeholder}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

function ActionButton({ disabled, label, onPress, primary = false }: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        primary && styles.actionButtonPrimary,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.actionButtonText, primary && styles.actionButtonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function StorageModeCard({ badge, description, icon, onPress, selected, title }: {
  badge?: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        selected && styles.modeCardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.modeIcon, selected && styles.modeIconSelected]}>
        <Ionicons color={selected ? theme.colors.primary : theme.colors.textSecondary} name={icon} size={21} />
      </View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text style={styles.modeTitle}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.secondary}>{description}</Text>
      </View>
      <Ionicons
        color={selected ? theme.colors.primary : theme.colors.border}
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={22}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  flex: { flex: 1 },
  activeBanner: { alignItems: "flex-start", backgroundColor: "#EFF6FF", borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.sm, marginBottom: theme.spacing.xs, padding: theme.spacing.md },
  activeTitle: { ...theme.typography.bodyStrong, color: theme.colors.primary },
  secondary: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  modeCard: { alignItems: "center", backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flexDirection: "row", gap: theme.spacing.md, minHeight: 92, padding: theme.spacing.md },
  modeCardSelected: { backgroundColor: "#F8FBFF", borderColor: theme.colors.primary },
  modeIcon: { alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, height: 42, justifyContent: "center", width: 42 },
  modeIconSelected: { backgroundColor: "#EFF6FF" },
  titleRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs },
  modeTitle: { ...theme.typography.bodyStrong, color: theme.colors.text },
  badge: { ...theme.typography.caption, backgroundColor: "#EFF6FF", borderRadius: theme.radius.pill, color: theme.colors.primary, overflow: "hidden", paddingHorizontal: theme.spacing.sm, paddingVertical: 2 },
  providerArea: { backgroundColor: theme.colors.background, borderRadius: theme.radius.md, padding: theme.spacing.md },
  label: { ...theme.typography.caption, color: theme.colors.textSecondary },
  providerSelect: { alignItems: "center", backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: theme.spacing.xs, minHeight: 48, paddingHorizontal: theme.spacing.md },
  providerValue: { ...theme.typography.body, color: theme.colors.text, flex: 1 },
  providerList: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, marginTop: theme.spacing.xs, overflow: "hidden" },
  providerOption: { alignItems: "center", borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 46, paddingHorizontal: theme.spacing.md },
  providerOptionText: { ...theme.typography.caption, color: theme.colors.text },
  connectionHint: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: theme.spacing.sm },
  credentials: { gap: theme.spacing.sm, marginTop: theme.spacing.md },
  oauthInfo: { alignItems: "center", backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.md, padding: theme.spacing.md },
  setupBox: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, gap: theme.spacing.xs, padding: theme.spacing.md },
  codeText: { ...theme.typography.caption, color: theme.colors.primary, marginTop: theme.spacing.xs },
  fieldLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  input: { ...theme.typography.body, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, color: theme.colors.text, minHeight: 48, paddingHorizontal: theme.spacing.md },
  actionRow: { flexDirection: "row", gap: theme.spacing.sm },
  actionButton: { alignItems: "center", borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: theme.spacing.md },
  actionButtonPrimary: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  actionButtonText: { ...theme.typography.button, color: theme.colors.text },
  actionButtonTextPrimary: { color: "#ffffff" },
  lastSync: { ...theme.typography.caption, color: theme.colors.textSecondary },
  pendingBanner: { alignItems: "center", backgroundColor: theme.colors.background, borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.sm, padding: theme.spacing.md },
  pendingText: { ...theme.typography.caption, color: theme.colors.textSecondary, flex: 1 },
  pathRow: { alignItems: "flex-start", flexDirection: "row", gap: theme.spacing.md, justifyContent: "space-between", marginTop: theme.spacing.xs },
  pathLabel: { ...theme.typography.caption, color: theme.colors.textSecondary },
  pathValue: { ...theme.typography.caption, color: theme.colors.text, flex: 1, fontWeight: "600", textAlign: "right" },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.5 },
});
