import { Ionicons } from "@expo/vector-icons";
import {
  useEffect,
  useState,
  type ComponentProps,
} from "react";

import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  ExternalStorageProvider,
  StorageMode,
} from "@savewise/shared";

import { useAppSettings } from "@/providers/app-settings-provider";
import {
  hasVerifiedAccountSession,
} from "@/services/account-client";
import {
  classifyAnonymousError,
  trackAnonymousEvent,
} from "@/services/anonymous-analytics";
import {
  connectDropbox,
  disconnectDropbox,
  getDropboxAppKey,
  getDropboxRedirectUri,
  syncWithDropbox,
  testStoredDropboxConnection,
} from "@/services/storage/dropbox-sync-service";
import {
  describeStorageTarget,
  storageProviderDefinitions,
} from "@/services/storage/storage-provider-registry";
import {
  deleteWebDavCredentials,
  loadWebDavCredentials,
  saveWebDavCredentials,
} from "@/services/storage/webdav-credentials";
import {
  syncWithWebDav,
  testWebDavConnection,
} from "@/services/storage/webdav-sync-service";
import { universeTheme } from "@/theme/universe-theme";

const providerNames: Record<
  ExternalStorageProvider,
  string
> = {
  dropbox: "Dropbox",
  "google-drive": "Google Drive",
  onedrive: "Microsoft OneDrive",
  "icloud-drive": "iCloud Drive",
  nextcloud: "Nextcloud",
  "synology-nas": "Synology NAS",
  webdav: "WebDAV",
};

export function StorageSettingsPanel() {
  const {
    settings,
    t,
    updateSettings,
  } = useAppSettings();

  const [
    providersOpen,
    setProvidersOpen,
  ] = useState(false);

  const [
    serverUrl,
    setServerUrl,
  ] = useState("");

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    isConnecting,
    setConnecting,
  ] = useState(false);

  const [
    isSyncing,
    setSyncing,
  ] = useState(false);

  const [
    dropboxAccount,
    setDropboxAccount,
  ] =
    useState<string | null>(null);

  const storage =
    settings.storage;

  const target =
    describeStorageTarget(
      storage.preferredMode,
      storage.provider,
    );

  const supportsWebDav =
    storage.provider ===
      "webdav" ||
    storage.provider ===
      "nextcloud" ||
    storage.provider ===
      "synology-nas";

  const supportsDropbox =
    storage.provider ===
    "dropbox";

  const dropboxAppKey =
    getDropboxAppKey();

  useEffect(() => {
    void loadWebDavCredentials().then(
      (credentials) => {
        if (!credentials) {
          return;
        }

        setServerUrl(
          credentials.serverUrl,
        );

        setUsername(
          credentials.username,
        );

        setPassword(
          credentials.password,
        );
      },
    );

    if (supportsDropbox) {
      void testStoredDropboxConnection()
        .then(
          (connection) => {
            setDropboxAccount(
              connection?.displayName ??
                null,
            );
          },
        )
        .catch(() => {
          setDropboxAccount(
            null,
          );
        });
    }
  }, []);

  async function selectMode(
    preferredMode: StorageMode,
  ) {
    if (
      preferredMode !== "local" &&
      !(await hasVerifiedAccountSession())
    ) {
      Alert.alert(
        t(
          "accountAuth.cloudLoginRequired",
        ),
        t(
          "accountAuth.cloudLoginRequiredDescription",
        ),
      );

      return;
    }

    if (
      preferredMode === "local"
    ) {
      await deleteWebDavCredentials();
      setPassword("");
    }

    await updateSettings(
      (current) => ({
        ...current,

        storage: {
          ...current.storage,

          activeMode: "local",

          preferredMode,

          provider:
            preferredMode ===
            "bring-your-own-cloud"
              ? current.storage
                  .provider
              : null,

          syncEnabled: false,

          connectionStatus:
            preferredMode === "local"
              ? "local-only"
              : "connection-required",
        },
      }),
    );
  }

  function selectProvider(
    provider:
      ExternalStorageProvider,
  ) {
    void updateSettings(
      (current) => ({
        ...current,

        storage: {
          ...current.storage,

          activeMode: "local",

          preferredMode:
            "bring-your-own-cloud",

          provider,

          syncEnabled: false,

          connectionStatus:
            "connection-required",
        },
      }),
    );

    setProvidersOpen(false);
  }

  async function connectWebDav() {
    if (
      !(await hasVerifiedAccountSession())
    ) {
      Alert.alert(
        t(
          "accountAuth.cloudLoginRequired",
        ),
        t(
          "accountAuth.cloudLoginRequiredDescription",
        ),
      );

      return;
    }

    const credentials = {
      serverUrl:
        serverUrl.trim(),

      username:
        username.trim(),

      password,
    };

    if (
      !credentials.serverUrl ||
      !credentials.username ||
      !credentials.password
    ) {
      Alert.alert(
        t(
          "settings.storageConnectionFailed",
        ),
        t(
          "settings.storageCredentialsRequired",
        ),
      );

      return;
    }

    setConnecting(true);

    try {
      await testWebDavConnection(
        credentials,
      );

      await saveWebDavCredentials(
        credentials,
      );

      await updateSettings(
        (current) => ({
          ...current,

          storage: {
            ...current.storage,

            activeMode:
              "bring-your-own-cloud",

            preferredMode:
              "bring-your-own-cloud",

            syncEnabled: true,

            connectionStatus:
              "connected",
          },
        }),
      );

      Alert.alert(
        t(
          "settings.storageConnected",
        ),
        t(
          "settings.storageConnectedDescription",
        ),
      );
    } catch (error) {
      await updateSettings(
        (current) => ({
          ...current,

          storage: {
            ...current.storage,

            activeMode: "local",

            syncEnabled: false,

            connectionStatus:
              "error",
          },
        }),
      );

      Alert.alert(
        t(
          "settings.storageConnectionFailed",
        ),
        error instanceof Error
          ? error.message
          : t(
              "settings.storageConnectionFailed",
            ),
      );
    } finally {
      setConnecting(false);
    }
  }

  async function syncNow() {
    if (
      !(await hasVerifiedAccountSession())
    ) {
      Alert.alert(
        t(
          "accountAuth.cloudLoginRequired",
        ),
        t(
          "accountAuth.cloudLoginRequiredDescription",
        ),
      );

      return;
    }

    setSyncing(true);

    const startedAt =
      Date.now();

    void trackAnonymousEvent(
      "SyncStarted",
      {
        operation: "cloud-sync",
      },
    );

    try {
      const result =
        supportsDropbox &&
        dropboxAppKey
          ? await syncWithDropbox(
              dropboxAppKey,
            )
          : await syncWithWebDav({
              serverUrl:
                serverUrl.trim(),

              username:
                username.trim(),

              password,
            });

      await updateSettings(
        (current) => ({
          ...current,

          storage: {
            ...current.storage,

            lastSyncAt:
              result.syncedAt,

            connectionStatus:
              "connected",
          },
        }),
      );

      Alert.alert(
        t(
          "settings.storageSyncComplete",
        ),
        t(
          "settings.storageSyncCompleteDescription",
          {
            count:
              result.uploadedDiscoveries,
          },
        ),
      );

      void trackAnonymousEvent(
        "SyncFinished",
        {
          durationMs:
            Date.now() -
            startedAt,

          itemCount:
            result.uploadedDiscoveries,

          operation:
            "cloud-sync",
        },
      );
    } catch (error) {
      void trackAnonymousEvent(
        "SyncFailed",
        {
          durationMs:
            Date.now() -
            startedAt,

          operation:
            "cloud-sync",

          errorKind:
            classifyAnonymousError(
              error,
            ),
        },
      );

      Alert.alert(
        t(
          "settings.storageSyncFailed",
        ),
        error instanceof Error
          ? error.message
          : t(
              "settings.storageSyncFailed",
            ),
      );
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (
      supportsDropbox &&
      dropboxAppKey
    ) {
      await disconnectDropbox(
        dropboxAppKey,
      );

      setDropboxAccount(null);
    } else {
      await deleteWebDavCredentials();
    }

    setPassword("");

    await updateSettings(
      (current) => ({
        ...current,

        storage: {
          ...current.storage,

          activeMode: "local",

          syncEnabled: false,

          connectionStatus:
            "connection-required",

          lastSyncAt: null,
        },
      }),
    );
  }

  async function connectDropboxAccount() {
    if (
      !(await hasVerifiedAccountSession())
    ) {
      Alert.alert(
        t(
          "accountAuth.cloudLoginRequired",
        ),
        t(
          "accountAuth.cloudLoginRequiredDescription",
        ),
      );

      return;
    }

    if (!dropboxAppKey) {
      Alert.alert(
        t(
          "settings.storageDropboxSetupRequired",
        ),
        t(
          "settings.storageDropboxSetupDescription",
        ),
      );

      return;
    }

    setConnecting(true);

    try {
      const connection =
        await connectDropbox(
          dropboxAppKey,
        );

      setDropboxAccount(
        connection.displayName,
      );

      await updateSettings(
        (current) => ({
          ...current,

          storage: {
            ...current.storage,

            activeMode:
              "bring-your-own-cloud",

            preferredMode:
              "bring-your-own-cloud",

            provider: "dropbox",

            syncEnabled: true,

            connectionStatus:
              "connected",
          },
        }),
      );

      Alert.alert(
        t(
          "settings.storageConnected",
        ),
        t(
          "settings.storageDropboxConnected",
          {
            name:
              connection.displayName,
          },
        ),
      );
    } catch (error) {
      Alert.alert(
        t(
          "settings.storageConnectionFailed",
        ),
        error instanceof Error
          ? error.message
          : t(
              "settings.storageConnectionFailed",
            ),
      );
    } finally {
      setConnecting(false);
    }
  }

  const isConnected =
    storage.connectionStatus ===
    "connected";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.activeBanner,

          isConnected &&
            styles.activeBannerConnected,
        ]}
      >
        <View
          style={[
            styles.activeIcon,

            isConnected &&
              styles.activeIconConnected,
          ]}
        >
          <Ionicons
            color={
              isConnected
                ? universeTheme.colors
                    .green
                : universeTheme.colors
                    .primaryBright
            }
            name={
              storage.activeMode ===
              "bring-your-own-cloud"
                ? "cloud-done-outline"
                : "phone-portrait-outline"
            }
            size={21}
          />
        </View>

        <View style={styles.flex}>
          <Text
            style={
              styles.activeEyebrow
            }
          >
            ACTIVE STORAGE
          </Text>

          <Text
            style={
              styles.activeTitle
            }
          >
            {t(
              storage.activeMode ===
                "bring-your-own-cloud"
                ? "settings.storageOwnCloud"
                : "settings.storageActiveLocal",
            )}
          </Text>

          <Text
            style={styles.secondary}
          >
            {t(
              storage.activeMode ===
                "bring-your-own-cloud"
                ? "settings.storageConnectedDescription"
                : "settings.storageLocalGuarantee",
            )}
          </Text>
        </View>

        <StorageStatus
          status={
            storage.connectionStatus
          }
        />
      </View>

      <StorageModeCard
        description={t(
          "settings.storageLocalDescription",
        )}
        icon="phone-portrait-outline"
        onPress={() => {
          void selectMode("local");
        }}
        selected={
          storage.preferredMode ===
          "local"
        }
        title={t(
          "settings.storageLocal",
        )}
      />

      <StorageModeCard
        badge={t(
          "settings.storagePremium",
        )}
        description={t(
          "settings.storageOwnCloudDescription",
        )}
        icon="cloud-outline"
        onPress={() => {
          void selectMode(
            "bring-your-own-cloud",
          );
        }}
        selected={
          storage.preferredMode ===
          "bring-your-own-cloud"
        }
        title={t(
          "settings.storageOwnCloud",
        )}
      />

      {storage.preferredMode ===
      "bring-your-own-cloud" ? (
        <View
          style={
            styles.providerArea
          }
        >
          <Text
            style={styles.label}
          >
            {t(
              "settings.storageProvider",
            )}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setProvidersOpen(
                (open) => !open,
              );
            }}
            style={({ pressed }) => [
              styles.providerSelect,

              pressed &&
                styles.pressed,
            ]}
          >
            <View
              style={
                styles.providerSelectIcon
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name={getProviderIcon(
                  storage.provider,
                )}
                size={19}
              />
            </View>

            <Text
              style={
                styles.providerValue
              }
            >
              {storage.provider
                ? providerNames[
                    storage.provider
                  ]
                : t(
                    "settings.storageChooseProvider",
                  )}
            </Text>

            <Ionicons
              color={
                universeTheme.colors
                  .textSecondary
              }
              name={
                providersOpen
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={18}
            />
          </Pressable>

          {providersOpen ? (
            <View
              style={
                styles.providerList
              }
            >
              {storageProviderDefinitions.map(
                (provider) => (
                  <Pressable
                    key={
                      provider.id
                    }
                    onPress={() => {
                      selectProvider(
                        provider.id,
                      );
                    }}
                    style={({
                      pressed,
                    }) => [
                      styles.providerOption,

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <View
                      style={
                        styles.providerOptionIcon
                      }
                    >
                      <Ionicons
                        color={
                          universeTheme
                            .colors
                            .primary
                        }
                        name={getProviderIcon(
                          provider.id,
                        )}
                        size={17}
                      />
                    </View>

                    <Text
                      style={
                        styles.providerOptionText
                      }
                    >
                      {
                        providerNames[
                          provider.id
                        ]
                      }
                    </Text>

                    {storage.provider ===
                    provider.id ? (
                      <Ionicons
                        color={
                          universeTheme
                            .colors
                            .primaryBright
                        }
                        name="checkmark-circle"
                        size={19}
                      />
                    ) : null}
                  </Pressable>
                ),
              )}
            </View>
          ) : null}

          <View
            style={
              styles.connectionHint
            }
          >
            <Ionicons
              color={
                universeTheme.colors
                  .violet
              }
              name="information-circle-outline"
              size={16}
            />

            <Text
              style={
                styles.connectionHintText
              }
            >
              {supportsWebDav
                ? t(
                    "settings.storageWebDavReady",
                  )
                : supportsDropbox
                  ? t(
                      "settings.storageDropboxReady",
                    )
                  : t(
                      "settings.storageOAuthPrepared",
                    )}
            </Text>
          </View>

          {supportsDropbox ? (
            <View
              style={
                styles.credentials
              }
            >
              {dropboxAppKey ? (
                <>
                  <View
                    style={
                      styles.oauthInfo
                    }
                  >
                    <View
                      style={
                        styles.oauthIcon
                      }
                    >
                      <Ionicons
                        color="#3B82F6"
                        name="logo-dropbox"
                        size={24}
                      />
                    </View>

                    <View
                      style={
                        styles.flex
                      }
                    >
                      <Text
                        style={
                          styles.modeTitle
                        }
                      >
                        {dropboxAccount ??
                          t(
                            "settings.storageDropboxNotConnected",
                          )}
                      </Text>

                      <Text
                        selectable
                        style={
                          styles.secondary
                        }
                      >
                        {getDropboxRedirectUri()}
                      </Text>
                    </View>
                  </View>

                  {isConnected &&
                  storage.provider ===
                    "dropbox" ? (
                    <View
                      style={
                        styles.actionRow
                      }
                    >
                      <ActionButton
                        disabled={
                          isSyncing
                        }
                        icon="sync-outline"
                        label={
                          isSyncing
                            ? t(
                                "settings.storageSyncing",
                              )
                            : t(
                                "settings.storageSyncNow",
                              )
                        }
                        onPress={() => {
                          void syncNow();
                        }}
                        primary
                      />

                      <ActionButton
                        icon="unlink-outline"
                        label={t(
                          "settings.storageDisconnect",
                        )}
                        onPress={() => {
                          void disconnect();
                        }}
                      />
                    </View>
                  ) : (
                    <ActionButton
                      disabled={
                        isConnecting
                      }
                      icon="logo-dropbox"
                      label={
                        isConnecting
                          ? t(
                              "settings.storageConnecting",
                            )
                          : t(
                              "settings.storageConnectDropbox",
                            )
                      }
                      onPress={() => {
                        void connectDropboxAccount();
                      }}
                      primary
                    />
                  )}
                </>
              ) : (
                <View
                  style={
                    styles.setupBox
                  }
                >
                  <Ionicons
                    color={
                      universeTheme
                        .colors.orange
                    }
                    name="construct-outline"
                    size={21}
                  />

                  <Text
                    style={
                      styles.modeTitle
                    }
                  >
                    {t(
                      "settings.storageDropboxSetupRequired",
                    )}
                  </Text>

                  <Text
                    style={
                      styles.secondary
                    }
                  >
                    {t(
                      "settings.storageDropboxSetupDescription",
                    )}
                  </Text>

                  <Text
                    selectable
                    style={
                      styles.codeText
                    }
                  >
                    EXPO_PUBLIC_DROPBOX_APP_KEY
                  </Text>

                  <Text
                    selectable
                    style={
                      styles.codeText
                    }
                  >
                    savewise://oauth/dropbox
                  </Text>
                </View>
              )}

              {storage.lastSyncAt ? (
                <LastSync
                  value={
                    storage.lastSyncAt
                  }
                />
              ) : null}
            </View>
          ) : null}

          {supportsWebDav ? (
            <View
              style={
                styles.credentials
              }
            >
              <CloudField
                autoCapitalize="none"
                icon="globe-outline"
                keyboardType="url"
                label={t(
                  "settings.storageServerUrl",
                )}
                onChangeText={
                  setServerUrl
                }
                placeholder="https://cloud.example.com/remote.php/dav/files/name"
                value={serverUrl}
              />

              <CloudField
                autoCapitalize="none"
                icon="person-outline"
                label={t(
                  "settings.storageUsername",
                )}
                onChangeText={
                  setUsername
                }
                value={username}
              />

              <CloudField
                autoCapitalize="none"
                icon="key-outline"
                label={t(
                  "settings.storagePassword",
                )}
                onChangeText={
                  setPassword
                }
                secureTextEntry
                value={password}
              />

              {isConnected ? (
                <View
                  style={
                    styles.actionRow
                  }
                >
                  <ActionButton
                    disabled={
                      isSyncing
                    }
                    icon="sync-outline"
                    label={
                      isSyncing
                        ? t(
                            "settings.storageSyncing",
                          )
                        : t(
                            "settings.storageSyncNow",
                          )
                    }
                    onPress={() => {
                      void syncNow();
                    }}
                    primary
                  />

                  <ActionButton
                    icon="unlink-outline"
                    label={t(
                      "settings.storageDisconnect",
                    )}
                    onPress={() => {
                      void disconnect();
                    }}
                  />
                </View>
              ) : (
                <ActionButton
                  disabled={
                    isConnecting
                  }
                  icon="link-outline"
                  label={
                    isConnecting
                      ? t(
                          "settings.storageConnecting",
                        )
                      : t(
                          "settings.storageConnect",
                        )
                  }
                  onPress={() => {
                    void connectWebDav();
                  }}
                  primary
                />
              )}

              {storage.lastSyncAt ? (
                <LastSync
                  value={
                    storage.lastSyncAt
                  }
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <StorageModeCard
        badge={t(
          "settings.storagePremiumPlus",
        )}
        description={t(
          "settings.storageSaveWiseDescription",
        )}
        icon="sparkles-outline"
        onPress={() => {
          void selectMode(
            "savewise-cloud",
          );
        }}
        selected={
          storage.preferredMode ===
          "savewise-cloud"
        }
        title={t(
          "settings.storageSaveWiseCloud",
        )}
      />

      {storage.preferredMode !==
        "local" &&
      !isConnected ? (
        <View
          style={
            styles.pendingBanner
          }
        >
          <View
            style={
              styles.pendingIcon
            }
          >
            <Ionicons
              color={
                universeTheme.colors
                  .orange
              }
              name="construct-outline"
              size={18}
            />
          </View>

          <Text
            style={
              styles.pendingText
            }
          >
            {t(
              "settings.storagePendingActivation",
            )}
          </Text>
        </View>
      ) : null}

      <View style={styles.pathRow}>
        <View
          style={
            styles.pathIcon
          }
        >
          <Ionicons
            color={
              universeTheme.colors
                .primary
            }
            name="folder-open-outline"
            size={17}
          />
        </View>

        <View style={styles.flex}>
          <Text
            style={
              styles.pathLabel
            }
          >
            {t(
              "settings.storageTargetPath",
            )}
          </Text>

          <Text
            selectable
            style={
              styles.pathValue
            }
          >
            {target.rootPath}
          </Text>
        </View>
      </View>
    </View>
  );
}

function LastSync({
  value,
}: {
  value: string;
}) {
  const { t } =
    useAppSettings();

  return (
    <View style={styles.lastSyncRow}>
      <Ionicons
        color={
          universeTheme.colors.green
        }
        name="checkmark-circle-outline"
        size={16}
      />

      <Text
        style={styles.lastSync}
      >
        {t(
          "settings.storageLastSync",
        )}
        :{" "}
        {new Date(
          value,
        ).toLocaleString()}
      </Text>
    </View>
  );
}

function CloudField({
  icon,
  label,
  ...props
}: ComponentProps<
  typeof TextInput
> & {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text
        style={styles.fieldLabel}
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
              .primary
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
          style={styles.input}
          {...props}
        />
      </View>
    </View>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
  primary = false,
}: {
  disabled?: boolean;
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,

        primary &&
          styles.actionButtonPrimary,

        disabled &&
          styles.disabled,

        pressed &&
          styles.pressed,
      ]}
    >
      <Ionicons
        color={
          primary
            ? "#03111E"
            : universeTheme.colors
                .textSecondary
        }
        name={icon}
        size={17}
      />

      <Text
        style={[
          styles.actionButtonText,

          primary &&
            styles.actionButtonTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StorageModeCard({
  badge,
  description,
  icon,
  onPress,
  selected,
  title,
}: {
  badge?: string;
  description: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{
        checked: selected,
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,

        selected &&
          styles.modeCardSelected,

        pressed &&
          styles.pressed,
      ]}
    >
      <View
        style={[
          styles.modeIcon,

          selected &&
            styles.modeIconSelected,
        ]}
      >
        <Ionicons
          color={
            selected
              ? universeTheme.colors
                  .primaryBright
              : universeTheme.colors
                  .textMuted
          }
          name={icon}
          size={21}
        />
      </View>

      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text
            style={styles.modeTitle}
          >
            {title}
          </Text>

          {badge ? (
            <Text
              style={styles.badge}
            >
              {badge}
            </Text>
          ) : null}
        </View>

        <Text
          style={styles.secondary}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        color={
          selected
            ? universeTheme.colors
                .primaryBright
            : universeTheme.colors
                .textMuted
        }
        name={
          selected
            ? "radio-button-on"
            : "radio-button-off"
        }
        size={22}
      />
    </Pressable>
  );
}

function StorageStatus({
  status,
}: {
  status:
    | "local-only"
    | "connection-required"
    | "connected"
    | "error";
}) {
  const color =
    status === "connected"
      ? universeTheme.colors.green
      : status === "error"
        ? universeTheme.colors.danger
        : status === "local-only"
          ? universeTheme.colors
              .primaryBright
          : universeTheme.colors.orange;

  const label =
    status === "connected"
      ? "CONNECTED"
      : status === "error"
        ? "ERROR"
        : status === "local-only"
          ? "LOCAL"
          : "SETUP";

  return (
    <View
      style={[
        styles.storageStatus,
        {
          backgroundColor:
            `${color}12`,
          borderColor:
            `${color}44`,
        },
      ]}
    >
      <View
        style={[
          styles.storageStatusDot,
          {
            backgroundColor: color,
          },
        ]}
      />

      <Text
        style={[
          styles.storageStatusText,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function getProviderIcon(
  provider:
    | ExternalStorageProvider
    | null,
): keyof typeof Ionicons.glyphMap {
  if (
    provider === "dropbox"
  ) {
    return "logo-dropbox";
  }

  if (
    provider ===
    "google-drive"
  ) {
    return "logo-google";
  }

  if (
    provider === "onedrive"
  ) {
    return "logo-microsoft";
  }

  if (
    provider ===
    "icloud-drive"
  ) {
    return "cloud-outline";
  }

  if (
    provider === "nextcloud" ||
    provider ===
      "synology-nas"
  ) {
    return "server-outline";
  }

  if (
    provider === "webdav"
  ) {
    return "globe-outline";
  }

  return "cloud-outline";
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },

  flex: {
    flex: 1,
  },

  activeBanner: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.06)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 2,
    padding: 13,
  },

  activeBannerConnected: {
    backgroundColor:
      "rgba(74, 222, 128, 0.05)",
    borderColor:
      "rgba(74, 222, 128, 0.22)",
  },

  activeIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.09)",
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  activeIconConnected: {
    backgroundColor:
      "rgba(74, 222, 128, 0.08)",
  },

  activeEyebrow: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  activeTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },

  secondary: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  storageStatus: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  storageStatusDot: {
    borderRadius: 999,
    height: 5,
    width: 5,
  },

  storageStatusText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  modeCard: {
    alignItems: "center",
    backgroundColor:
      "rgba(3, 12, 24, 0.65)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 88,
    padding: 13,
  },

  modeCardSelected: {
    backgroundColor:
      "rgba(56, 189, 248, 0.07)",
    borderColor:
      universeTheme.colors
        .primaryBright,
  },

  modeIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(148, 163, 184, 0.06)",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  modeIconSelected: {
    backgroundColor:
      "rgba(56, 189, 248, 0.11)",
  },

  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  modeTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },

  badge: {
    backgroundColor:
      "rgba(139, 92, 246, 0.09)",
    borderColor:
      "rgba(139, 92, 246, 0.24)",
    borderRadius: 999,
    borderWidth: 1,
    color:
      universeTheme.colors.violet,
    fontSize: 8,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  providerArea: {
    backgroundColor:
      "rgba(3, 12, 24, 0.5)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    padding: 13,
  },

  label: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },

  providerSelect: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 7,
    minHeight: 50,
    paddingHorizontal: 12,
  },

  providerSelectIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: 9,
    height: 32,
    justifyContent: "center",
    width: 32,
  },

  providerValue: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },

  providerList: {
    backgroundColor:
      "rgba(6, 20, 36, 0.98)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
  },

  providerOption: {
    alignItems: "center",
    borderBottomColor:
      universeTheme.colors.border,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 11,
  },

  providerOptionIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.06)",
    borderRadius: 8,
    height: 29,
    justifyContent: "center",
    width: 29,
  },

  providerOptionText: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },

  connectionHint: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(139, 92, 246, 0.05)",
    borderColor:
      "rgba(139, 92, 246, 0.18)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
    padding: 10,
  },

  connectionHintText: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },

  credentials: {
    gap: 10,
    marginTop: 13,
  },

  oauthInfo: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.9)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 12,
  },

  oauthIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(59, 130, 246, 0.1)",
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  setupBox: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(251, 146, 60, 0.05)",
    borderColor:
      "rgba(251, 146, 60, 0.2)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },

  codeText: {
    color:
      universeTheme.colors
        .primaryBright,
    fontFamily:
      Platform.select({
        ios: "Menlo",
        default: "monospace",
      }),
    fontSize: 9,
    marginTop: 3,
  },

  field: {
    marginBottom: 2,
  },

  fieldLabel: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 7,
  },

  inputWrapper: {
    alignItems: "center",
    backgroundColor:
      "rgba(6, 20, 36, 0.94)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 49,
    paddingHorizontal: 12,
  },

  input: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 12,
    minHeight: 47,
    paddingVertical: 11,
  },

  actionRow: {
    flexDirection: "row",
    gap: 8,
  },

  actionButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(148, 163, 184, 0.05)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 10,
  },

  actionButtonPrimary: {
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderColor:
      universeTheme.colors
        .primaryBright,
  },

  actionButtonText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    fontWeight: "900",
  },

  actionButtonTextPrimary: {
    color: "#03111E",
  },

  lastSyncRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },

  lastSync: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 9,
    lineHeight: 14,
  },

  pendingBanner: {
    alignItems: "center",
    backgroundColor:
      "rgba(251, 146, 60, 0.05)",
    borderColor:
      "rgba(251, 146, 60, 0.18)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    padding: 11,
  },

  pendingIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(251, 146, 60, 0.08)",
    borderRadius: 9,
    height: 32,
    justifyContent: "center",
    width: 32,
  },

  pendingText: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },

  pathRow: {
    alignItems: "flex-start",
    backgroundColor:
      "rgba(3, 12, 24, 0.5)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 11,
  },

  pathIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.07)",
    borderRadius: 9,
    height: 32,
    justifyContent: "center",
    width: 32,
  },

  pathLabel: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 9,
    fontWeight: "700",
  },

  pathValue: {
    color:
      universeTheme.colors.text,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 14,
    marginTop: 3,
  },

  pressed: {
    opacity: 0.7,
  },

  disabled: {
    opacity: 0.42,
  },
});
