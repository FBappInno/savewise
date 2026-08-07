import {
  Ionicons,
} from "@expo/vector-icons";

import {
  Image,
} from "expo-image";

import * as Sharing from "expo-sharing";

import type {
  Discovery,
} from "@savewise/shared";

import {
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  downloadDiscoveryAttachment,
} from "@/services/discovery-attachment-client";

import {
  universeTheme,
} from "@/theme/universe-theme";

export function DiscoveryAttachmentViewer({
  discovery,
}: {
  discovery:
    Discovery;
}) {
  const [
    imageUri,
    setImageUri,
  ] =
    useState<string | null>(
      null,
    );

  const [
    imageVisible,
    setImageVisible,
  ] =
    useState(false);

  const [
    isOpening,
    setOpening,
  ] =
    useState(false);

  const attachment =
    discovery.attachment;

  if (!attachment) {
    return null;
  }

  const isImage =
    attachment.captureType ===
    "image";

  const isPdf =
    attachment.captureType ===
    "pdf";

  async function handleOpen() {
    if (isOpening) {
      return;
    }

    setOpening(true);

    try {
      const file =
        await downloadDiscoveryAttachment(
          discovery,
        );

      if (isImage) {
        setImageUri(
          file.localUri,
        );

        setImageVisible(
          true,
        );

        return;
      }

      if (isPdf) {
        const available =
          await Sharing
            .isAvailableAsync();

        if (!available) {
          throw new Error(
            "Die iOS-Dateiansicht ist nicht verfügbar.",
          );
        }

        await Sharing.shareAsync(
          file.localUri,
          {
            mimeType:
              file.mimeType,

            UTI:
              "com.adobe.pdf",

            dialogTitle:
              file.fileName,
          },
        );
      }
    } catch (error) {
      Alert.alert(
        "Originaldatei konnte nicht geöffnet werden",
        error instanceof Error
          ? error.message
          : "Unbekannter Dateifehler.",
      );
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={
          isOpening
        }
        onPress={() => {
          void handleOpen();
        }}
        style={({ pressed }) => [
          styles.button,

          pressed &&
            styles.pressed,
        ]}
      >
        <View style={styles.icon}>
          {isOpening ? (
            <ActivityIndicator
              color={
                universeTheme
                  .colors
                  .primaryBright
              }
              size="small"
            />
          ) : (
            <Ionicons
              color={
                universeTheme
                  .colors
                  .primaryBright
              }
              name={
                isPdf
                  ? "document-text-outline"
                  : "image-outline"
              }
              size={20}
            />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.eyebrow}>
            ORIGINALDATEI
          </Text>

          <Text style={styles.title}>
            {isPdf
              ? "PDF öffnen"
              : "Bild öffnen"}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.fileName}
          >
            {
              attachment.fileName
            }
          </Text>
        </View>

        <Ionicons
          color={
            universeTheme
              .colors
              .textMuted
          }
          name="chevron-forward"
          size={18}
        />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setImageVisible(
            false,
          );
        }}
        presentationStyle="fullScreen"
        visible={
          imageVisible
        }
      >
        <SafeAreaView
          style={styles.previewScreen}
        >
          <View style={styles.previewHeader}>
            <Text
              numberOfLines={1}
              style={
                styles.previewTitle
              }
            >
              {
                attachment.fileName
              }
            </Text>

            <Pressable
              hitSlop={12}
              onPress={() => {
                setImageVisible(
                  false,
                );
              }}
              style={
                styles.closeButton
              }
            >
              <Ionicons
                color="#FFFFFF"
                name="close"
                size={25}
              />
            </Pressable>
          </View>

          {imageUri ? (
            <Image
              contentFit="contain"
              source={{
                uri:
                  imageUri,
              }}
              style={
                styles.previewImage
              }
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles =
  StyleSheet.create({
    button: {
      alignItems:
        "center",

      backgroundColor:
        universeTheme.colors
          .surfaceStrong,

      borderColor:
        universeTheme.colors
          .border,

      borderRadius:
        15,

      borderWidth:
        1,

      flexDirection:
        "row",

      gap:
        11,

      marginHorizontal:
        16,

      marginTop:
        13,

      minHeight:
        76,

      padding:
        13,
    },

    icon: {
      alignItems:
        "center",

      backgroundColor:
        "rgba(56, 189, 248, 0.08)",

      borderRadius:
        11,

      height:
        43,

      justifyContent:
        "center",

      width:
        43,
    },

    content: {
      flex:
        1,
    },

    eyebrow: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        8,

      fontWeight:
        "900",

      letterSpacing:
        0.8,
    },

    title: {
      color:
        universeTheme.colors
          .text,

      fontSize:
        14,

      fontWeight:
        "800",

      marginTop:
        3,
    },

    fileName: {
      color:
        universeTheme.colors
          .textMuted,

      fontSize:
        10,

      marginTop:
        3,
    },

    previewScreen: {
      backgroundColor:
        "#000000",

      flex:
        1,
    },

    previewHeader: {
      alignItems:
        "center",

      flexDirection:
        "row",

      gap:
        12,

      minHeight:
        56,

      paddingHorizontal:
        17,
    },

    previewTitle: {
      color:
        "#FFFFFF",

      flex:
        1,

      fontSize:
        13,

      fontWeight:
        "700",
    },

    closeButton: {
      alignItems:
        "center",

      height:
        42,

      justifyContent:
        "center",

      width:
        42,
    },

    previewImage: {
      flex:
        1,

      width:
        "100%",
    },

    pressed: {
      opacity:
        0.7,
    },
  });
