import {
  Ionicons,
} from "@expo/vector-icons";

import {
  Image,
} from "expo-image";

import * as SecureStore from "expo-secure-store";

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
  WebView,
} from "react-native-webview";

import {
  downloadDiscoveryAttachment,
} from "@/services/discovery-attachment-client";

import {
  universeTheme,
} from "@/theme/universe-theme";

const SESSION_KEY =
  "savewise.account.session.v1";

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
    viewerVisible,
    setViewerVisible,
  ] =
    useState(false);

  const [
    pdfUrl,
    setPdfUrl,
  ] =
    useState<string | null>(
      null,
    );

  const [
    pdfToken,
    setPdfToken,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isOpening,
    setOpening,
  ] =
    useState(false);

  const [
    pdfLoading,
    setPdfLoading,
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

  async function handleOpen():
  Promise<void> {
    if (isOpening) {
      return;
    }

    setOpening(true);

    try {
      if (isPdf) {
        const apiUrl =
          process.env
            .EXPO_PUBLIC_API_URL
            ?.replace(
              /\/$/,
              "",
            );

        if (!apiUrl) {
          throw new Error(
            "EXPO_PUBLIC_API_URL ist nicht konfiguriert.",
          );
        }

        const token =
          await SecureStore
            .getItemAsync(
              SESSION_KEY,
            );

        if (!token) {
          throw new Error(
            "Deine SaveWise-Anmeldung ist abgelaufen.",
          );
        }

        setPdfToken(
          token,
        );

        setPdfUrl(
          `${apiUrl}/api/capture/attachments/${encodeURIComponent(
            discovery.id,
          )}`,
        );

        setViewerVisible(
          true,
        );

        return;
      }

      if (isImage) {
        const file =
          await downloadDiscoveryAttachment(
            discovery,
          );

        setImageUri(
          file.localUri,
        );

        setViewerVisible(
          true,
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

  function closeViewer():
  void {
    setViewerVisible(
      false,
    );

    setImageUri(
      null,
    );

    setPdfUrl(
      null,
    );

    setPdfToken(
      null,
    );

    setPdfLoading(
      false,
    );
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
              ? "PDF anzeigen"
              : "Bild anzeigen"}
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
        animationType="slide"
        onRequestClose={
          closeViewer
        }
        presentationStyle="fullScreen"
        visible={
          viewerVisible
        }
      >
        <SafeAreaView
          style={
            styles.viewerScreen
          }
        >
          <View style={styles.viewerHeader}>
            <View style={styles.viewerHeaderText}>
              <Text style={styles.viewerEyebrow}>
                {isPdf
                  ? "PDF"
                  : "BILD"}
              </Text>

              <Text
                numberOfLines={1}
                style={styles.viewerTitle}
              >
                {
                  attachment.fileName
                }
              </Text>
            </View>

            <Pressable
              hitSlop={12}
              onPress={
                closeViewer
              }
              style={styles.closeButton}
            >
              <Ionicons
                color="#FFFFFF"
                name="close"
                size={25}
              />
            </Pressable>
          </View>

          {isImage &&
          imageUri ? (
            <View style={styles.imageStage}>
              <Image
                contentFit="contain"
                source={{
                  uri:
                    imageUri,
                }}
                style={styles.previewImage}
              />
            </View>
          ) : null}

          {isPdf &&
          pdfUrl &&
          pdfToken ? (
            <View style={styles.pdfStage}>
              {pdfLoading ? (
                <View style={styles.pdfLoader}>
                  <ActivityIndicator
                    color={
                      universeTheme
                        .colors
                        .primaryBright
                    }
                    size="large"
                  />

                  <Text style={styles.pdfLoaderText}>
                    PDF wird geladen …
                  </Text>
                </View>
              ) : null}

              <WebView
                allowFileAccess
                javaScriptEnabled
                onError={(event) => {
                  setPdfLoading(
                    false,
                  );

                  Alert.alert(
                    "PDF konnte nicht angezeigt werden",
                    event.nativeEvent
                      .description,
                  );
                }}
                onLoadEnd={() => {
                  setPdfLoading(
                    false,
                  );
                }}
                onLoadStart={() => {
                  setPdfLoading(
                    true,
                  );
                }}
                originWhitelist={[
                  "*",
                ]}
                source={{
                  uri:
                    pdfUrl,

                  headers: {
                    Authorization:
                      `Bearer ${pdfToken}`,
                  },
                }}
                style={styles.pdfViewer}
              />
            </View>
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

    viewerScreen: {
      backgroundColor:
        "#020A12",

      flex:
        1,
    },

    viewerHeader: {
      alignItems:
        "center",

      borderBottomColor:
        "rgba(115, 216, 255, 0.14)",

      borderBottomWidth:
        StyleSheet
          .hairlineWidth,

      flexDirection:
        "row",

      minHeight:
        62,

      paddingHorizontal:
        16,
    },

    viewerHeaderText: {
      flex:
        1,
    },

    viewerEyebrow: {
      color:
        universeTheme.colors
          .primaryBright,

      fontSize:
        8,

      fontWeight:
        "900",

      letterSpacing:
        1,
    },

    viewerTitle: {
      color:
        "#FFFFFF",

      fontSize:
        14,

      fontWeight:
        "800",

      marginTop:
        2,
    },

    closeButton: {
      alignItems:
        "center",

      height:
        44,

      justifyContent:
        "center",

      width:
        44,
    },

    imageStage: {
      backgroundColor:
        "#000000",

      flex:
        1,
    },

    previewImage: {
      flex:
        1,

      width:
        "100%",
    },

    pdfStage: {
      backgroundColor:
        "#FFFFFF",

      flex:
        1,

      position:
        "relative",
    },

    pdfViewer: {
      backgroundColor:
        "#FFFFFF",

      flex:
        1,
    },

    pdfLoader: {
      alignItems:
        "center",

      backgroundColor:
        "#071A2B",

      gap:
        13,

      inset:
        0,

      justifyContent:
        "center",

      position:
        "absolute",

      zIndex:
        5,
    },

    pdfLoaderText: {
      color:
        universeTheme.colors
          .textSecondary,

      fontSize:
        12,
    },

    pressed: {
      opacity:
        0.7,
    },
  });
