import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  ActivityIndicator,
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

import { StorageSettingsPanel } from "@/components/settings/storage-settings-panel";
import { StarBackground } from "@/components/universe-ui/star-background";
import { formatAppDateTime } from "@/i18n/date-time";
import { useAppSettings } from "@/providers/app-settings-provider";
import { hybridKnowledgeRepository } from "@/repositories/hybrid-knowledge-repository";
import {
  deleteMyAnonymousAnalytics,
} from "@/services/anonymous-analytics";
import {
  loginAccount,
  requestAccountVerification,
} from "@/services/account-client";
import {
  getKnowledgeLibrary,
} from "@/services/content-import-client";
import { universeTheme } from "@/theme/universe-theme";

import type {
  DateFormat,
  DisplayLanguage,
  InputLanguage,
  TimeFormat,
} from "@/types/app-settings";

const OPTIMIZATION_STAGES = [
  "Discoveries analysieren",
  "Domänen überprüfen",
  "Topics neu gruppieren",
  "Unterthemen strukturieren",
  "Verbindungen berechnen",
] as const;

type OptimizationResult = {
  discoveries: number;
  domains: number;
  topics: number;
  subtopics: number;
};

export default function SettingsScreen() {
  const {
    locale,
    settings,
    t,
    updateSettings,
  } = useAppSettings();

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
    oldPassword,
    setOldPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    loginPassword,
    setLoginPassword,
  ] = useState("");

  const [
    isSaving,
    setSaving,
  ] = useState(false);

  const [
    lastKnowledgeUpdate,
    setLastKnowledgeUpdate,
  ] =
    useState<string | null>(null);

  const [
    isDeletingAnalytics,
    setDeletingAnalytics,
  ] = useState(false);


  const [
    isOptimizationModalVisible,
    setOptimizationModalVisible,
  ] = useState(false);

  const [
    isOptimizingUniverse,
    setOptimizingUniverse,
  ] = useState(false);

  const [
    optimizationStageIndex,
    setOptimizationStageIndex,
  ] = useState(0);

  useEffect(() => {
    setUsername(
      settings.account.username,
    );

    setEmail(
      settings.account.email,
    );
  }, [
    settings.account.email,
    settings.account.username,
  ]);

  useEffect(() => {
    void getKnowledgeLibrary()
      .then((library) => {
        setLastKnowledgeUpdate(
          library.graph?.generatedAt ??
            library.generatedAt,
        );
      })
      .catch(() => {
        setLastKnowledgeUpdate(null);
      });
  }, []);

  async function handleSaveAccount() {
    if (
      !username.trim() ||
      !email.trim() ||
      newPassword.length < 10
    ) {
      Alert.alert(
        t(
          "accountAuth.invalidInput",
        ),
        t(
          "accountAuth.passwordRequirements",
        ),
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      Alert.alert(
        t(
          "accountAuth.passwordMismatch",
        ),
        t(
          "accountAuth.passwordMismatchDescription",
        ),
      );

      return;
    }

    setSaving(true);

    try {
      await requestAccountVerification(
        {
          username:
            username.trim(),

          email:
            email.trim(),

          ...(oldPassword
            ? {
                oldPassword,
              }
            : {}),

          newPassword,
        },
      );

      await updateSettings(
        (current) => ({
          ...current,

          account: {
            ...current.account,

            username:
              username.trim(),

            email:
              email.trim(),
          },
        }),
      );

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Alert.alert(
        t(
          "accountAuth.emailSent",
        ),
        t(
          "accountAuth.emailSentDescription",
        ),
      );
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : "ACCOUNT_UPDATE_FAILED";

      Alert.alert(
        t(
          "accountAuth.updateFailed",
        ),
        code ===
          "OLD_PASSWORD_REQUIRED" ||
          code ===
            "OLD_PASSWORD_INVALID"
          ? t(
              "accountAuth.oldPasswordInvalid",
            )
          : t(
              "accountAuth.updateFailedDescription",
            ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyticsChange(
    usageAnalytics: boolean,
  ) {
    await updateSettings(
      (current) => ({
        ...current,

        privacy: {
          ...current.privacy,

          analyticsConsent:
            usageAnalytics
              ? "granted"
              : "denied",

          usageAnalytics,
        },
      }),
    );
  }

  async function handleLogin() {
    if (
      !email.trim() ||
      !loginPassword
    ) {
      return;
    }

    setSaving(true);

    try {
      await loginAccount(
        email.trim(),
        loginPassword,
      );

      setLoginPassword("");

      Alert.alert(
        t(
          "accountAuth.loginSuccess",
        ),
        t(
          "accountAuth.loginSuccessDescription",
        ),
      );
    } catch {
      Alert.alert(
        t(
          "accountAuth.loginFailed",
        ),
        t(
          "accountAuth.loginFailedDescription",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAnalytics() {
    setDeletingAnalytics(true);

    try {
      const deletedEvents =
        await deleteMyAnonymousAnalytics();

      await updateSettings(
        (current) => ({
          ...current,

          privacy: {
            ...current.privacy,

            analyticsConsent:
              "denied",

            usageAnalytics:
              false,
          },
        }),
      );

      Alert.alert(
        t(
          "settings.analyticsDeleted",
        ),
        t(
          "settings.analyticsDeletedDescription",
          {
            count:
              deletedEvents,
          },
        ),
      );
    } catch {
      Alert.alert(
        t(
          "settings.analyticsDeleteFailed",
        ),
        t(
          "settings.analyticsDeleteFailedDescription",
        ),
      );
    } finally {
      setDeletingAnalytics(false);
    }
  }

  function requestUniverseOptimization() {
    if (
      !settings.ai
        .knowledgeGraph
    ) {
      Alert.alert(
        "Wissensgraph deaktiviert",
        "Aktiviere zuerst den dynamischen Wissensgraphen.",
      );

      return;
    }

    setOptimizationStageIndex(0);
    setOptimizationModalVisible(
      true,
    );
  }

  async function handleOptimizeUniverse() {
    if (isOptimizingUniverse) {
      return;
    }

    setOptimizingUniverse(true);
    setOptimizationStageIndex(0);

    const stageTimer =
      setInterval(() => {
        setOptimizationStageIndex(
          (current) =>
            Math.min(
              current + 1,
              OPTIMIZATION_STAGES.length -
                1,
            ),
        );
      }, 12_000);

    try {
      const rebuiltLibrary =
        await hybridKnowledgeRepository.rebuild();

      const graph =
        rebuiltLibrary.graph;

      const nodes =
        graph?.nodes ?? [];

      const result:
        OptimizationResult = {
        discoveries:
          rebuiltLibrary
            .discoveries.length,

        domains:
          nodes.filter(
            (node) =>
              node.kind ===
              "domain",
          ).length,

        topics:
          nodes.filter(
            (node) =>
              node.kind ===
              "topic",
          ).length,

        subtopics:
          nodes.filter(
            (node) =>
              node.kind ===
                "subtopic" ||
              node.kind ===
                "concept",
          ).length,
      };

      setLastKnowledgeUpdate(
        graph?.generatedAt ??
          rebuiltLibrary.generatedAt,
      );

      setOptimizationModalVisible(
        false,
      );

      Alert.alert(
        "Optimierung abgeschlossen",
        [
          `${result.discoveries} Discoveries analysiert`,
          `${result.domains} Domänen`,
          `${result.topics} Topics`,
          `${result.subtopics} Unterthemen`,
          "",
          "Die neue Struktur wurde lokal gespeichert.",
        ].join("\n"),
        [
          {
            text: "Schließen",
            style: "cancel",
          },

          {
            text:
              "Universum öffnen",

            onPress: () => {
              router.replace(
                "/(tabs)",
              );
            },
          },
        ],
      );
    } catch (optimizationError) {
      setOptimizationModalVisible(
        false,
      );

      Alert.alert(
        "Optimierung fehlgeschlagen",
        optimizationError instanceof Error
          ? optimizationError.message
          : "Das Wissensuniversum konnte nicht optimiert werden. Die bestehende Struktur bleibt erhalten.",
      );
    } finally {
      clearInterval(stageTimer);

      setOptimizingUniverse(false);
      setOptimizationStageIndex(0);
    }
  }

  const enabledAiSystems = [
    settings.ai.contentAnalysis,
    settings.ai.knowledgeGraph,
    settings.ai.autonomousResearch,
  ].filter(Boolean).length;

  const connectionLabel =
    settings.storage.connectionStatus ===
    "connected"
      ? "CONNECTED"
      : settings.storage
            .connectionStatus ===
          "local-only"
        ? "LOCAL"
        : settings.storage
              .connectionStatus ===
            "error"
          ? "ERROR"
          : "READY";

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      style={styles.screen}
    >
      <StarBackground density={90} />

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View
              style={
                styles.coreIcon
              }
            >
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="settings-outline"
                size={25}
              />
            </View>

            <View style={styles.flex}>
              <Text
                style={styles.eyebrow}
              >
                SAVEWISE CORE
              </Text>

              <Text style={styles.title}>
                Control Center
              </Text>
            </View>

            <StatusBadge
              label="ONLINE"
              tone="success"
            />
          </View>

          <Text style={styles.subtitle}>
            Verwalte Konto, KI,
            Speicher, Datenschutz und
            Systemeinstellungen.
          </Text>
        </View>

        <View
          style={
            styles.systemOverview
          }
        >
          <SystemMetric
            icon="hardware-chip-outline"
            label="AI Core"
            value={`${enabledAiSystems}/3`}
          />

          <SystemMetric
            icon="server-outline"
            label="Storage"
            value={connectionLabel}
          />

          <SystemMetric
            icon="shield-checkmark-outline"
            label="Privacy"
            value={
              settings.privacy
                .usageAnalytics
                ? "ACTIVE"
                : "PRIVATE"
            }
          />
        </View>

        <SettingsSection
          description="Verwalte Anmeldung, Registrierung und den Schutz deines Kontos."
          icon="person-circle-outline"
          title="Konto"
          tone="cyan"
        >
          <View style={styles.accountIdentity}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {getInitials(
                  settings.account.username,
                  settings.account.email,
                )}
              </Text>
            </View>

            <View style={styles.flex}>
              <Text style={styles.identityName}>
                {settings.account.username.trim() ||
                  "SaveWise Benutzer"}
              </Text>

              <Text style={styles.identityEmail}>
                {settings.account.email.trim() ||
                  "Noch nicht angemeldet"}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push({
                pathname: "/account",
              } as never);
            }}
            style={({ pressed }) => [
              styles.accountPortalButton,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.accountPortalIcon}>
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="person-circle-outline"
                size={21}
              />
            </View>

            <View style={styles.flex}>
              <Text style={styles.accountPortalTitle}>
                Konto & Anmeldung
              </Text>

              <Text style={styles.accountPortalDescription}>
                Konto erstellen, anmelden und Biometrie verwalten.
              </Text>
            </View>

            <Ionicons
              color={
                universeTheme.colors
                  .textMuted
              }
              name="chevron-forward"
              size={19}
            />
          </Pressable>
        </SettingsSection>

        <SettingsSection
          description={t(
            "settings.aiDescription",
          )}
          icon="sparkles-outline"
          title={t("settings.ai")}
          tone="violet"
        >
          <ToggleRow
            description="Analysiert neue Links und erzeugt strukturierte Metadaten."
            icon="scan-outline"
            label={t(
              "settings.contentAnalysis",
            )}
            onValueChange={(
              contentAnalysis,
            ) => {
              void updateSettings(
                (current) => ({
                  ...current,

                  ai: {
                    ...current.ai,
                    contentAnalysis,
                  },
                }),
              );
            }}
            value={
              settings.ai
                .contentAnalysis
            }
          />

          <ToggleRow
            description="Verbindet Themen und Discoveries zu deinem Wissensuniversum."
            icon="git-network-outline"
            label={t(
              "settings.knowledgeGraph",
            )}
            onValueChange={(
              knowledgeGraph,
            ) => {
              void updateSettings(
                (current) => ({
                  ...current,

                  ai: {
                    ...current.ai,
                    knowledgeGraph,
                  },
                }),
              );
            }}
            value={
              settings.ai
                .knowledgeGraph
            }
          />

          <ToggleRow
            description="Erkennt Trends, Wissenslücken und neue externe Quellen."
            icon="telescope-outline"
            label={t(
              "settings.autonomousResearch",
            )}
            onValueChange={(
              autonomousResearch,
            ) => {
              void updateSettings(
                (current) => ({
                  ...current,

                  ai: {
                    ...current.ai,
                    autonomousResearch,
                  },
                }),
              );
            }}
            value={
              settings.ai
                .autonomousResearch
            }
          />


          <UniverseOptimizationPanel
            disabled={
              !settings.ai
                .knowledgeGraph ||
              isOptimizingUniverse
            }
            onPress={
              requestUniverseOptimization
            }
          />
        </SettingsSection>

        <SettingsSection
          description={t(
            "settings.storageDescription",
          )}
          icon="server-outline"
          title={t(
            "settings.storage",
          )}
          tone="green"
        >
          <StorageSettingsPanel />
        </SettingsSection>

        <SettingsSection
          description={t(
            "settings.languageDescription",
          )}
          icon="language-outline"
          title={t(
            "settings.language",
          )}
          tone="cyan"
        >
          <DropdownSelect<DisplayLanguage>
            icon="language-outline"
            label={t(
              "settings.displayLanguage",
            )}
            onChange={(display) => {
              void updateSettings(
                (current) => ({
                  ...current,

                  language: {
                    ...current.language,
                    display,
                  },
                }),
              );
            }}
            options={[
              {
                label: t(
                  "settings.system",
                ),
                value: "system",
              },
              {
                label: t(
                  "settings.german",
                ),
                value: "de",
              },
              {
                label: t(
                  "settings.english",
                ),
                value: "en",
              },
              {
                label: t(
                  "settings.french",
                ),
                value: "fr",
              },
              {
                label: t(
                  "settings.italian",
                ),
                value: "it",
              },
              {
                label: t(
                  "settings.spanish",
                ),
                value: "es",
              },
            ]}
            value={
              settings.language.display
            }
          />

          <DropdownSelect<InputLanguage>
            icon="mic-outline"
            label={t(
              "settings.inputLanguage",
            )}
            onChange={(input) => {
              void updateSettings(
                (current) => ({
                  ...current,

                  language: {
                    ...current.language,
                    input,
                  },
                }),
              );
            }}
            options={[
              {
                label: t(
                  "settings.automatic",
                ),
                value: "auto",
              },
              {
                label: t(
                  "settings.german",
                ),
                value: "de",
              },
              {
                label: t(
                  "settings.english",
                ),
                value: "en",
              },
              {
                label: t(
                  "settings.french",
                ),
                value: "fr",
              },
              {
                label: t(
                  "settings.italian",
                ),
                value: "it",
              },
              {
                label: t(
                  "settings.spanish",
                ),
                value: "es",
              },
            ]}
            value={
              settings.language.input
            }
          />
        </SettingsSection>

        <SettingsSection
          description={t(
            "settings.dateTimeDescription",
          )}
          icon="calendar-outline"
          title={t(
            "settings.dateTime",
          )}
          tone="violet"
        >
          <DropdownSelect<DateFormat>
            icon="calendar-number-outline"
            label={t(
              "settings.dateFormat",
            )}
            onChange={(
              dateFormat,
            ) => {
              void updateSettings(
                (current) => ({
                  ...current,

                  dateTime: {
                    ...current.dateTime,
                    dateFormat,
                  },
                }),
              );
            }}
            options={[
              {
                label: t(
                  "settings.dateDayMonthYear",
                ),
                value:
                  "day-month-year",
              },
              {
                label: t(
                  "settings.dateMonthDayYear",
                ),
                value:
                  "month-day-year",
              },
              {
                label: t(
                  "settings.dateYearMonthDay",
                ),
                value:
                  "year-month-day",
              },
            ]}
            value={
              settings.dateTime
                .dateFormat
            }
          />

          <DropdownSelect<TimeFormat>
            icon="time-outline"
            label={t(
              "settings.timeFormat",
            )}
            onChange={(
              timeFormat,
            ) => {
              void updateSettings(
                (current) => ({
                  ...current,

                  dateTime: {
                    ...current.dateTime,
                    timeFormat,
                  },
                }),
              );
            }}
            options={[
              {
                label: t(
                  "settings.system",
                ),
                value: "system",
              },
              {
                label: t(
                  "settings.time24Hour",
                ),
                value: "24-hour",
              },
              {
                label: t(
                  "settings.time12Hour",
                ),
                value: "12-hour",
              },
            ]}
            value={
              settings.dateTime
                .timeFormat
            }
          />
        </SettingsSection>

        <SettingsSection
          icon="shield-checkmark-outline"
          title={t(
            "settings.privacy",
          )}
          tone="green"
        >
          <ToggleRow
            description={t(
              "settings.analyticsDescription",
            )}
            icon="analytics-outline"
            label={t(
              "settings.analytics",
            )}
            onValueChange={(
              usageAnalytics,
            ) => {
              void handleAnalyticsChange(
                usageAnalytics,
              );
            }}
            value={
              settings.privacy
                .usageAnalytics
            }
          />

          <View
            style={
              styles.analyticsFacts
            }
          >
            <PrivacyFact
              text={t(
                "settings.analyticsNoContent",
              )}
            />

            <PrivacyFact
              text={t(
                "settings.analyticsTechnicalOnly",
              )}
            />

            <PrivacyFact
              text={t(
                "settings.analyticsRetention",
              )}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={
              isDeletingAnalytics
            }
            onPress={() => {
              void handleDeleteAnalytics();
            }}
            style={({ pressed }) => [
              styles.deleteAnalyticsButton,

              pressed &&
                styles.pressed,

              isDeletingAnalytics &&
                styles.disabled,
            ]}
          >
            <Ionicons
              color={
                universeTheme.colors
                  .danger
              }
              name="trash-outline"
              size={17}
            />

            <Text
              style={
                styles.deleteAnalyticsText
              }
            >
              {isDeletingAnalytics
                ? t(
                    "settings.analyticsDeleting",
                  )
                : t(
                    "settings.analyticsDelete",
                  )}
            </Text>
          </Pressable>

          <ToggleRow
            description={t(
              "settings.externalProcessingDescription",
            )}
            icon="cloud-upload-outline"
            label={t(
              "settings.externalProcessing",
            )}
            onValueChange={(
              externalContentProcessing,
            ) => {
              void updateSettings(
                (current) => ({
                  ...current,

                  privacy: {
                    ...current.privacy,
                    externalContentProcessing,
                  },
                }),
              );
            }}
            value={
              settings.privacy
                .externalContentProcessing
            }
          />
        </SettingsSection>

        <SettingsSection
          icon="information-circle-outline"
          title={t(
            "settings.appVersion",
          )}
          tone="cyan"
        >
          <InfoRow
            icon="apps-outline"
            label={t(
              "settings.appVersion",
            )}
            value={
              Constants.expoConfig
                ?.version ?? "1.0.0"
            }
          />

          <InfoRow
            icon="sync-outline"
            label={t(
              "settings.lastUpdate",
            )}
            value={
              lastKnowledgeUpdate
                ? formatAppDateTime(
                    lastKnowledgeUpdate,
                    locale,
                    settings.dateTime
                      .dateFormat,
                    settings.dateTime
                      .timeFormat,
                  )
                : t(
                    "settings.unavailable",
                  )
            }
          />

          <InfoRow
            icon="hardware-chip-outline"
            label="AI Systems"
            value={`${enabledAiSystems} aktiv`}
          />

          <InfoRow
            icon="cloud-outline"
            label="Storage Mode"
            value={connectionLabel}
          />
        </SettingsSection>
      </ScrollView>

      <UniverseOptimizationModal
        currentStage={
          OPTIMIZATION_STAGES[
            optimizationStageIndex
          ]
        }
        onCancel={() => {
          if (
            !isOptimizingUniverse
          ) {
            setOptimizationModalVisible(
              false,
            );
          }
        }}
        onConfirm={() => {
          void handleOptimizeUniverse();
        }}
        running={
          isOptimizingUniverse
        }
        visible={
          isOptimizationModalVisible
        }
      />
    </KeyboardAvoidingView>
  );
}

function UniverseOptimizationPanel({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={
        styles.optimizationPanel
      }
    >
      <View
        style={
          styles.optimizationHeader
        }
      >
        <View
          style={
            styles.optimizationIcon
          }
        >
          <Ionicons
            color={
              universeTheme.colors
                .violet
            }
            name="sparkles"
            size={22}
          />
        </View>

        <View style={styles.flex}>
          <Text
            style={
              styles.optimizationEyebrow
            }
          >
            KNOWLEDGE ARCHITECT
          </Text>

          <Text
            style={
              styles.optimizationTitle
            }
          >
            Wissensuniversum optimieren
          </Text>
        </View>
      </View>

      <Text
        style={
          styles.optimizationDescription
        }
      >
        Die KI analysiert alle
        Discoveries erneut und verbessert
        Domänen, Topics, Unterthemen und
        deren Beziehungen.
      </Text>

      <View
        style={
          styles.optimizationFacts
        }
      >
        <OptimizationFact
          text="Domänen konsolidieren"
        />

        <OptimizationFact
          text="Topics neu gruppieren"
        />

        <OptimizationFact
          text="Unterthemen strukturieren"
        />

        <OptimizationFact
          text="Verbindungen aktualisieren"
        />
      </View>

      <Pressable
        accessibilityLabel="Wissensuniversum optimieren"
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.optimizeButton,

          pressed &&
            styles.pressed,

          disabled &&
            styles.disabled,
        ]}
      >
        <Ionicons
          color="#F8FAFC"
          name="sparkles-outline"
          size={18}
        />

        <Text
          style={
            styles.optimizeButtonText
          }
        >
          Jetzt optimieren
        </Text>
      </Pressable>

      {disabled ? (
        <Text
          style={
            styles.optimizationDisabledText
          }
        >
          Der dynamische Wissensgraph muss
          aktiviert sein.
        </Text>
      ) : null}
    </View>
  );
}

function OptimizationFact({
  text,
}: {
  text: string;
}) {
  return (
    <View
      style={
        styles.optimizationFact
      }
    >
      <Ionicons
        color={
          universeTheme.colors.green
        }
        name="checkmark-circle-outline"
        size={15}
      />

      <Text
        style={
          styles.optimizationFactText
        }
      >
        {text}
      </Text>
    </View>
  );
}

function UniverseOptimizationModal({
  currentStage,
  onCancel,
  onConfirm,
  running,
  visible,
}: {
  currentStage: string;
  onCancel: () => void;
  onConfirm: () => void;
  running: boolean;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View
        style={
          styles.optimizationModalBackdrop
        }
      >
        <View
          style={
            styles.optimizationModal
          }
        >
          <View
            style={
              styles.optimizationModalIcon
            }
          >
            {running ? (
              <ActivityIndicator
                color={
                  universeTheme.colors
                    .primaryBright
                }
                size="large"
              />
            ) : (
              <Ionicons
                color={
                  universeTheme.colors
                    .primaryBright
                }
                name="planet-outline"
                size={31}
              />
            )}
          </View>

          <Text
            style={
              styles.optimizationModalEyebrow
            }
          >
            SAVEWISE KNOWLEDGE ARCHITECT
          </Text>

          <Text
            style={
              styles.optimizationModalTitle
            }
          >
            {running
              ? "Wissensuniversum wird optimiert …"
              : "Wissensuniversum optimieren?"}
          </Text>

          {running ? (
            <>
              <Text
                style={
                  styles.optimizationStage
                }
              >
                {currentStage}
              </Text>

              <View
                style={
                  styles.optimizationProgressTrack
                }
              >
                <View
                  style={
                    styles.optimizationProgressFill
                  }
                />
              </View>

              <Text
                style={
                  styles.optimizationModalText
                }
              >
                Bitte SaveWise geöffnet
                lassen. Der Vorgang kann
                je nach Bibliothek bis zu
                drei Minuten dauern.
              </Text>
            </>
          ) : (
            <>
              <Text
                style={
                  styles.optimizationModalText
                }
              >
                Alle Discoveries werden
                erneut strukturiert. Die
                bestehende Bibliothek
                bleibt erhalten, falls der
                Vorgang fehlschlägt.
              </Text>

              <View
                style={
                  styles.optimizationModalFacts
                }
              >
                <OptimizationFact
                  text="Domänen werden überprüft"
                />

                <OptimizationFact
                  text="Topics werden neu gruppiert"
                />

                <OptimizationFact
                  text="Unterthemen werden strukturiert"
                />

                <OptimizationFact
                  text="Beziehungen werden aktualisiert"
                />
              </View>

              <View
                style={
                  styles.optimizationModalActions
                }
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.optimizationCancelButton,

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={
                      styles.optimizationCancelText
                    }
                  >
                    Abbrechen
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    styles.optimizationConfirmButton,

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Ionicons
                    color="#03111E"
                    name="sparkles"
                    size={17}
                  />

                  <Text
                    style={
                      styles.optimizationConfirmText
                    }
                  >
                    Optimieren
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function getInitials(
  username: string,
  email: string,
): string {
  const source =
    username.trim() ||
    email.trim() ||
    "S";

  const parts = source
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase(),
    )
    .join("");
}

function SystemMetric({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.systemMetric}>
      <Ionicons
        color={
          universeTheme.colors.primary
        }
        name={icon}
        size={18}
      />

      <Text
        style={
          styles.systemMetricValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.systemMetricLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone:
    | "success"
    | "warning"
    | "error";
}) {
  const color =
    tone === "success"
      ? universeTheme.colors.green
      : tone === "warning"
        ? universeTheme.colors.orange
        : universeTheme.colors.danger;

  return (
    <View
      style={[
        styles.statusBadge,
        {
          borderColor:
            `${color}44`,
          backgroundColor:
            `${color}12`,
        },
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      />

      <Text
        style={[
          styles.statusBadgeText,
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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons
          color={
            universeTheme.colors
              .primaryBright
          }
          name={icon}
          size={17}
        />
      </View>

      <Text
        style={styles.infoLabel}
      >
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={styles.infoValue}
      >
        {value}
      </Text>
    </View>
  );
}

function SettingsSection({
  children,
  description,
  icon,
  title,
  tone,
}: {
  children: ReactNode;
  description?: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  title: string;
  tone:
    | "cyan"
    | "violet"
    | "green";
}) {
  const color =
    tone === "violet"
      ? universeTheme.colors.violet
      : tone === "green"
        ? universeTheme.colors.green
        : universeTheme.colors
            .primaryBright;

  return (
    <View style={styles.section}>
      <View
        style={[
          styles.sectionGlow,
          {
            backgroundColor: color,
          },
        ]}
      />

      <View
        style={
          styles.sectionTitleRow
        }
      >
        <View
          style={[
            styles.sectionIcon,
            {
              backgroundColor:
                `${color}14`,

              borderColor:
                `${color}44`,
            },
          ]}
        >
          <Ionicons
            color={color}
            name={icon}
            size={21}
          />
        </View>

        <View style={styles.flex}>
          <Text
            style={
              styles.sectionEyebrow
            }
          >
            SYSTEM MODULE
          </Text>

          <Text
            style={
              styles.sectionTitle
            }
          >
            {title}
          </Text>
        </View>
      </View>

      {description ? (
        <Text
          style={
            styles.sectionDescription
          }
        >
          {description}
        </Text>
      ) : null}

      <View style={styles.sectionBody}>
        {children}
      </View>
    </View>
  );
}

function Field({
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
          {...inputProps}
        />
      </View>
    </View>
  );
}

function DropdownSelect<
  T extends string,
>({
  icon,
  label,
  onChange,
  options,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  onChange: (value: T) => void;
  options: {
    label: string;
    value: T;
  }[];
  value: T;
}) {
  const [
    isOpen,
    setOpen,
  ] = useState(false);

  const selectedLabel =
    options.find(
      (option) =>
        option.value === value,
    )?.label ?? value;

  return (
    <View
      style={
        styles.dropdownGroup
      }
    >
      <Text
        style={
          styles.controlLabel
        }
      >
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.dropdown,

          pressed &&
            styles.pressed,
        ]}
      >
        <Ionicons
          color={
            universeTheme.colors
              .primary
          }
          name={icon}
          size={18}
        />

        <Text
          style={
            styles.dropdownValue
          }
        >
          {selectedLabel}
        </Text>

        <Ionicons
          color={
            universeTheme.colors
              .textSecondary
          }
          name="chevron-down"
          size={19}
        />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setOpen(false);
        }}
        transparent
        visible={isOpen}
      >
        <Pressable
          onPress={() => {
            setOpen(false);
          }}
          style={
            styles.modalBackdrop
          }
        >
          <Pressable
            onPress={() =>
              undefined
            }
            style={
              styles.optionSheet
            }
          >
            <View
              style={
                styles.optionSheetHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.optionEyebrow
                  }
                >
                  SELECT OPTION
                </Text>

                <Text
                  style={
                    styles.optionSheetTitle
                  }
                >
                  {label}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                hitSlop={12}
                onPress={() => {
                  setOpen(false);
                }}
              >
                <Ionicons
                  color={
                    universeTheme
                      .colors
                      .textSecondary
                  }
                  name="close"
                  size={23}
                />
              </Pressable>
            </View>

            {options.map(
              (option) => {
                const selected =
                  option.value === value;

                return (
                  <Pressable
                    key={
                      option.value
                    }
                    onPress={() => {
                      onChange(
                        option.value,
                      );

                      setOpen(false);
                    }}
                    style={({
                      pressed,
                    }) => [
                      styles.dropdownOption,

                      selected &&
                        styles.dropdownOptionSelected,

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,

                        selected &&
                          styles.dropdownOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>

                    {selected ? (
                      <Ionicons
                        color={
                          universeTheme
                            .colors
                            .primaryBright
                        }
                        name="checkmark-circle"
                        size={21}
                      />
                    ) : null}
                  </Pressable>
                );
              },
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ToggleRow({
  description,
  icon,
  label,
  onValueChange,
  value,
}: {
  description?: string;
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  onValueChange: (
    value: boolean,
  ) => void;
  value: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View
        style={[
          styles.toggleIcon,
          value &&
            styles.toggleIconActive,
        ]}
      >
        <Ionicons
          color={
            value
              ? universeTheme.colors
                  .primaryBright
              : universeTheme.colors
                  .textMuted
          }
          name={icon}
          size={18}
        />
      </View>

      <View
        style={styles.toggleText}
      >
        <View
          style={
            styles.toggleTitleRow
          }
        >
          <Text
            style={
              styles.toggleLabel
            }
          >
            {label}
          </Text>

          <Text
            style={[
              styles.toggleStatus,

              value
                ? styles.toggleStatusActive
                : styles.toggleStatusInactive,
            ]}
          >
            {value
              ? "ONLINE"
              : "OFFLINE"}
          </Text>
        </View>

        {description ? (
          <Text
            style={
              styles.toggleDescription
            }
          >
            {description}
          </Text>
        ) : null}
      </View>

      <Switch
        ios_backgroundColor="rgba(148, 163, 184, 0.16)"
        onValueChange={
          onValueChange
        }
        thumbColor="#F8FAFC"
        trackColor={{
          false:
            "rgba(148, 163, 184, 0.16)",

          true:
            universeTheme.colors
              .primary,
        }}
        value={value}
      />
    </View>
  );
}

function PrivacyFact({
  text,
}: {
  text: string;
}) {
  return (
    <View
      style={
        styles.privacyFact
      }
    >
      <Ionicons
        color={
          universeTheme.colors.green
        }
        name="checkmark-circle-outline"
        size={16}
      />

      <Text
        style={
          styles.analyticsFact
        }
      >
        {text}
      </Text>
    </View>
  );
}

function PrimaryButton({
  disabled,
  icon,
  label,
  loading,
  onPress,
}: {
  disabled?: boolean;
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.saveButton,

        pressed &&
          styles.pressed,

        disabled &&
          styles.disabled,
      ]}
    >
      {loading ? (
        <Ionicons
          color="#03111E"
          name="sync-outline"
          size={18}
        />
      ) : (
        <Ionicons
          color="#03111E"
          name={icon}
          size={18}
        />
      )}

      <Text
        style={
          styles.saveButtonText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.loginButton,

        pressed &&
          styles.pressed,

        disabled &&
          styles.disabled,
      ]}
    >
      <Ionicons
        color={
          universeTheme.colors
            .primaryBright
        }
        name={icon}
        size={18}
      />

      <Text
        style={
          styles.loginButtonText
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor:
      universeTheme.colors.background,
    flex: 1,
  },

  content: {
    paddingBottom: 130,
    paddingHorizontal: 18,
    paddingTop: 58,
  },

  flex: {
    flex: 1,
  },

  header: {
    marginBottom: 20,
  },

  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },

  coreIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.1)",
    borderColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 17,
    borderWidth: 1.5,
    height: 52,
    justifyContent: "center",
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    width: 52,
  },

  eyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  title: {
    color:
      universeTheme.colors.text,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 33,
  },

  subtitle: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 13,
    maxWidth: 355,
  },

  statusBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  statusDot: {
    borderRadius: 999,
    height: 6,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    width: 6,
  },

  statusBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  systemOverview: {
    backgroundColor:
      "rgba(6, 20, 36, 0.78)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 18,
    paddingVertical: 14,
  },

  systemMetric: {
    alignItems: "center",
    flex: 1,
  },

  systemMetricValue: {
    color:
      universeTheme.colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 4,
  },

  systemMetricLabel: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 9,
    marginTop: 2,
  },

  section: {
    backgroundColor:
      "rgba(6, 20, 36, 0.95)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    padding: 17,
  },

  sectionGlow: {
    height: 2,
    left: 0,
    opacity: 0.75,
    position: "absolute",
    right: 0,
    top: 0,
  },

  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },

  sectionIcon: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },

  sectionEyebrow: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  sectionTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },

  sectionDescription: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 11,
  },

  sectionBody: {
    marginTop: 17,
  },

  accountPortalButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.07)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    minHeight: 62,
    paddingHorizontal: 12,
  },

  accountPortalIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.11)",
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },

  accountPortalTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },

  accountPortalDescription: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  accountIdentity: {
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
    marginBottom: 16,
    padding: 13,
  },

  avatarCircle: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.1)",
    borderColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 48,
    justifyContent: "center",
    width: 48,
  },

  avatarText: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 17,
    fontWeight: "900",
  },

  identityName: {
    color:
      universeTheme.colors.text,
    fontSize: 14,
    fontWeight: "900",
  },

  identityEmail: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    marginTop: 3,
  },

  field: {
    marginBottom: 13,
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
      "rgba(3, 12, 24, 0.72)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 13,
  },

  input: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 13,
    minHeight: 48,
    paddingVertical: 12,
  },

  saveButton: {
    alignItems: "center",
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderRadius:
      universeTheme.radius.md,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    shadowColor:
      universeTheme.colors.primary,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 13,
  },

  saveButtonText: {
    color: "#03111E",
    fontSize: 13,
    fontWeight: "900",
  },

  accountDivider: {
    backgroundColor:
      universeTheme.colors.border,
    height: 1,
    marginVertical: 20,
  },

  controlEyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  controlTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 13,
    marginTop: 3,
  },

  loginButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.07)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 49,
  },

  loginButtonText: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 13,
    fontWeight: "900",
  },

  dropdownGroup: {
    marginBottom: 15,
  },

  controlLabel: {
    color:
      universeTheme.colors.text,
    fontSize: 11,
    fontWeight: "800",
  },

  dropdown: {
    alignItems: "center",
    backgroundColor:
      "rgba(3, 12, 24, 0.72)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    minHeight: 50,
    paddingHorizontal: 13,
  },

  dropdownValue: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 13,
  },

  modalBackdrop: {
    backgroundColor:
      "rgba(1, 6, 15, 0.78)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 17,
  },

  optionSheet: {
    backgroundColor: "#071426",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    padding: 17,
  },

  optionSheetHeader: {
    alignItems: "center",
    borderBottomColor:
      universeTheme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent:
      "space-between",
    paddingBottom: 14,
  },

  optionEyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },

  optionSheetTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },

  dropdownOption: {
    alignItems: "center",
    borderBottomColor:
      universeTheme.colors.border,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent:
      "space-between",
    minHeight: 52,
    paddingHorizontal: 8,
  },

  dropdownOptionSelected: {
    backgroundColor:
      "rgba(56, 189, 248, 0.07)",
  },

  dropdownOptionText: {
    color:
      universeTheme.colors.text,
    fontSize: 13,
  },

  dropdownOptionTextSelected: {
    color:
      universeTheme.colors
        .primaryBright,
    fontWeight: "800",
  },

  toggleRow: {
    alignItems: "center",
    borderBottomColor:
      universeTheme.colors.border,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 74,
    paddingVertical: 10,
  },

  toggleIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(148, 163, 184, 0.06)",
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    width: 38,
  },

  toggleIconActive: {
    backgroundColor:
      "rgba(56, 189, 248, 0.1)",
  },

  toggleText: {
    flex: 1,
  },

  toggleTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },

  toggleLabel: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
  },

  toggleStatus: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  toggleStatusActive: {
    color:
      universeTheme.colors.green,
  },

  toggleStatusInactive: {
    color:
      universeTheme.colors
        .textMuted,
  },

  toggleDescription: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  analyticsFacts: {
    backgroundColor:
      "rgba(3, 12, 24, 0.65)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    gap: 8,
    marginTop: 11,
    padding: 12,
  },

  privacyFact: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },

  analyticsFact: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },

  deleteAnalyticsButton: {
    alignItems: "center",
    backgroundColor:
      "rgba(248, 113, 113, 0.06)",
    borderColor:
      "rgba(248, 113, 113, 0.26)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 46,
  },

  deleteAnalyticsText: {
    color:
      universeTheme.colors.danger,
    fontSize: 11,
    fontWeight: "900",
  },

  infoRow: {
    alignItems: "center",
    borderBottomColor:
      universeTheme.colors.border,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingVertical: 8,
  },

  infoIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.08)",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },

  infoLabel: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 11,
  },

  infoValue: {
    color:
      universeTheme.colors.text,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
    textAlign: "right",
  },

  optimizationPanel: {
    backgroundColor:
      "rgba(50, 34, 86, 0.44)",
    borderColor:
      "rgba(167, 139, 250, 0.34)",
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    marginTop: 18,
    padding: 15,
  },

  optimizationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },

  optimizationIcon: {
    alignItems: "center",
    backgroundColor:
      "rgba(139, 92, 246, 0.14)",
    borderColor:
      "rgba(167, 139, 250, 0.30)",
    borderRadius: 13,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },

  optimizationEyebrow: {
    color:
      universeTheme.colors.violet,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  optimizationTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3,
  },

  optimizationDescription: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 13,
  },

  optimizationFacts: {
    gap: 8,
    marginTop: 13,
  },

  optimizationFact: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },

  optimizationFactText: {
    color:
      universeTheme.colors
        .textSecondary,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },

  optimizeButton: {
    alignItems: "center",
    backgroundColor:
      universeTheme.colors.violet,
    borderRadius:
      universeTheme.radius.md,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
    shadowColor:
      universeTheme.colors.violet,
    shadowOffset: {
      height: 0,
      width: 0,
    },
    shadowOpacity: 0.36,
    shadowRadius: 12,
  },

  optimizeButtonText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "900",
  },

  optimizationDisabledText: {
    color:
      universeTheme.colors
        .textMuted,
    fontSize: 9,
    marginTop: 8,
    textAlign: "center",
  },

  optimizationModalBackdrop: {
    alignItems: "center",
    backgroundColor:
      "rgba(1, 6, 15, 0.84)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },

  optimizationModal: {
    backgroundColor: "#071426",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius:
      universeTheme.radius.lg,
    borderWidth: 1,
    maxWidth: 430,
    padding: 20,
    width: "100%",
  },

  optimizationModalIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor:
      "rgba(56, 189, 248, 0.10)",
    borderColor:
      universeTheme.colors
        .borderStrong,
    borderRadius: 999,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68,
  },

  optimizationModalEyebrow: {
    color:
      universeTheme.colors.primary,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginTop: 17,
    textAlign: "center",
  },

  optimizationModalTitle: {
    color:
      universeTheme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
    marginTop: 5,
    textAlign: "center",
  },

  optimizationModalText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 12,
    textAlign: "center",
  },

  optimizationModalFacts: {
    backgroundColor:
      "rgba(3, 12, 24, 0.64)",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    gap: 9,
    marginTop: 17,
    padding: 13,
  },

  optimizationStage: {
    color:
      universeTheme.colors
        .primaryBright,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 20,
    textAlign: "center",
  },

  optimizationProgressTrack: {
    backgroundColor:
      "rgba(148, 163, 184, 0.12)",
    borderRadius: 999,
    height: 7,
    marginTop: 13,
    overflow: "hidden",
  },

  optimizationProgressFill: {
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderRadius: 999,
    height: "100%",
    width: "72%",
  },

  optimizationModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  optimizationCancelButton: {
    alignItems: "center",
    borderColor:
      universeTheme.colors.border,
    borderRadius:
      universeTheme.radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },

  optimizationCancelText: {
    color:
      universeTheme.colors
        .textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },

  optimizationConfirmButton: {
    alignItems: "center",
    backgroundColor:
      universeTheme.colors
        .primaryBright,
    borderRadius:
      universeTheme.radius.md,
    flex: 1.25,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 48,
  },

  optimizationConfirmText: {
    color: "#03111E",
    fontSize: 12,
    fontWeight: "900",
  },

  disabled: {
    opacity: 0.42,
  },

  pressed: {
    opacity: 0.7,
  },
});
