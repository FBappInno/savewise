import { Ionicons } from "@expo/vector-icons";

import React, {
  useCallback,
  useState,
} from "react";

import {
  ActivityIndicator,
  InteractionManager,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  universeTheme,
} from "@/theme/universe-theme";

type DiscoveryActionsMenuProps = {
  exportingPdf: boolean;

  onEdit: () =>
    void | Promise<void>;

  onExportPdf: () =>
    void | Promise<void>;

  onShare: () =>
    void | Promise<void>;
};

export function DiscoveryActionsMenu({
  exportingPdf,
  onEdit,
  onExportPdf,
  onShare,
}: DiscoveryActionsMenuProps) {
  const [
    visible,
    setVisible,
  ] = useState(false);

  const [
    pendingAction,
    setPendingAction,
  ] = useState(false);

  const closeMenu =
    useCallback(() => {
      setVisible(false);
    }, []);

  const runAfterMenuCloses =
    useCallback(
      (
        action: () =>
          void | Promise<void>,
      ) => {
        if (pendingAction) {
          return;
        }

        setPendingAction(true);
        setVisible(false);

        /*
         * iOS kann kein natives Share-Sheet zuverlässig
         * präsentieren, solange unser eigenes Modal noch
         * sichtbar ist.
         *
         * Zuerst warten wir auf das Schließen des Modals und
         * auf das Ende laufender UI-Interaktionen. Danach wird
         * die native Aktion ausgeführt.
         */
        InteractionManager.runAfterInteractions(
          () => {
            setTimeout(() => {
              Promise.resolve(
                action(),
              )
                .catch(() => {
                  /*
                   * Die eigentliche Aktion zeigt ihre eigene
                   * Fehlermeldung in der Detailseite.
                   */
                })
                .finally(() => {
                  setPendingAction(
                    false,
                  );
                });
            }, 250);
          },
        );
      },
      [pendingAction],
    );

  return (
    <>
      <Pressable
        accessibilityLabel="Weitere Aktionen"
        accessibilityRole="button"
        disabled={pendingAction}
        hitSlop={8}
        onPress={() => {
          setVisible(true);
        }}
        style={({ pressed }) => [
          styles.trigger,

          pressed &&
            styles.pressed,

          pendingAction &&
            styles.disabled,
        ]}
      >
        {pendingAction ? (
          <ActivityIndicator
            color={
              universeTheme.colors
                .text
            }
            size="small"
          />
        ) : (
          <Ionicons
            color={
              universeTheme.colors
                .text
            }
            name="ellipsis-horizontal"
            size={23}
          />
        )}
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={
          closeMenu
        }
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <View
          style={
            styles.modalRoot
          }
        >
          <Pressable
            accessibilityLabel="Menü schließen"
            accessibilityRole="button"
            onPress={
              closeMenu
            }
            style={
              StyleSheet.absoluteFill
            }
          />

          <View
            pointerEvents="box-none"
            style={
              styles.menuPosition
            }
          >
            <View
              style={
                styles.menu
              }
            >
              <MenuAction
                icon="share-outline"
                label="Teilen"
                onPress={() => {
                  runAfterMenuCloses(
                    onShare,
                  );
                }}
              />

              <View
                style={
                  styles.separator
                }
              />

              <MenuAction
                disabled={
                  exportingPdf
                }
                icon="document-text-outline"
                label={
                  exportingPdf
                    ? "PDF wird erstellt …"
                    : "Als PDF speichern"
                }
                loading={
                  exportingPdf
                }
                onPress={() => {
                  runAfterMenuCloses(
                    onExportPdf,
                  );
                }}
              />

              <View
                style={
                  styles.separator
                }
              />

              <MenuAction
                icon="create-outline"
                label="Anpassen"
                onPress={() => {
                  runAfterMenuCloses(
                    onEdit,
                  );
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuAction({
  disabled = false,
  icon,
  label,
  loading = false,
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
      accessibilityLabel={
        label
      }
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,

        pressed &&
          styles.pressed,

        disabled &&
          styles.disabled,
      ]}
    >
      <View
        style={
          styles.actionIcon
        }
      >
        {loading ? (
          <ActivityIndicator
            color={
              universeTheme.colors
                .primaryBright
            }
            size="small"
          />
        ) : (
          <Ionicons
            color={
              universeTheme.colors
                .primaryBright
            }
            name={icon}
            size={20}
          />
        )}
      </View>

      <Text
        style={
          styles.actionText
        }
      >
        {label}
      </Text>

      <Ionicons
        color={
          universeTheme.colors
            .textMuted
        }
        name="chevron-forward"
        size={16}
      />
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    trigger: {
      alignItems: "center",

      backgroundColor:
        "rgba(148, 163, 184, 0.10)",

      borderColor:
        universeTheme.colors
          .border,

      borderRadius: 999,
      borderWidth: 1,

      height: 42,

      justifyContent:
        "center",

      width: 42,
    },

    modalRoot: {
      backgroundColor:
        "rgba(2, 6, 23, 0.46)",

      flex: 1,
    },

    menuPosition: {
      alignItems: "flex-end",

      paddingHorizontal: 17,
      paddingTop: 78,
    },

    menu: {
      backgroundColor:
        universeTheme.colors
          .surfaceStrong,

      borderColor:
        universeTheme.colors
          .borderStrong,

      borderRadius: 18,
      borderWidth: 1,

      minWidth: 235,

      overflow: "hidden",

      shadowColor:
        "#000000",

      shadowOffset: {
        height: 8,
        width: 0,
      },

      shadowOpacity: 0.32,
      shadowRadius: 18,
    },

    action: {
      alignItems: "center",

      flexDirection: "row",

      gap: 11,

      minHeight: 58,

      paddingHorizontal: 13,
    },

    actionIcon: {
      alignItems: "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.10)",

      borderRadius: 11,

      height: 36,

      justifyContent:
        "center",

      width: 36,
    },

    actionText: {
      color:
        universeTheme.colors
          .text,

      flex: 1,

      fontSize: 13,
      fontWeight: "800",
    },

    separator: {
      backgroundColor:
        universeTheme.colors
          .border,

      height:
        StyleSheet.hairlineWidth,

      marginLeft: 60,
    },

    pressed: {
      opacity: 0.64,
    },

    disabled: {
      opacity: 0.45,
    },
  });
