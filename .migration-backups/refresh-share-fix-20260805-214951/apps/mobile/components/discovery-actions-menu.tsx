
import { Ionicons } from "@expo/vector-icons";

import {
  ActivityIndicator,
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
  onEdit: () => void;
  onExportPdf: () => void;
  onShare: () => void;
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
  ] = React.useState(false);

  function close() {
    setVisible(false);
  }

  function run(
    action: () => void,
  ) {
    close();
    action();
  }

  return (
    <>
      <Pressable
        accessibilityLabel="Weitere Aktionen"
        accessibilityRole="button"
        onPress={() => {
          setVisible(true);
        }}
        style={({ pressed }) => [
          styles.trigger,
          pressed &&
            styles.pressed,
        ]}
      >
        <Ionicons
          color={
            universeTheme.colors
              .text
          }
          name="ellipsis-horizontal"
          size={23}
        />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={close}
        transparent
        visible={visible}
      >
        <Pressable
          onPress={close}
          style={styles.backdrop}
        >
          <View
            style={
              styles.menuPosition
            }
          >
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
              }}
              style={styles.menu}
            >
              <MenuAction
                icon="share-outline"
                label="Teilen"
                onPress={() => {
                  run(onShare);
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
                  run(onExportPdf);
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
                  run(onEdit);
                }}
              />
            </Pressable>
          </View>
        </Pressable>
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

import React from "react";

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
      justifyContent: "center",
      width: 42,
    },

    backdrop: {
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
      shadowColor: "#000000",
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
      justifyContent: "center",
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
