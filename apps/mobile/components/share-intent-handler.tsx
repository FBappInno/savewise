import {
  useShareIntentContext,
} from "expo-share-intent";

import {
  useEffect,
} from "react";

import {
  Alert,
} from "react-native";

import {
  useRouter,
} from "expo-router";

import {
  importContent,
  isValidDiscoveryUrl,
} from "@/services/content-import-client";

export function ShareIntentHandler() {
  const {
    hasShareIntent,
    shareIntent,
    resetShareIntent,
    error,
  } =
    useShareIntentContext();

  const router =
    useRouter();

  useEffect(() => {
    if (error) {
      Alert.alert(
        "Teilen fehlgeschlagen",
        String(
          error,
        ),
      );
    }
  }, [error]);

  useEffect(() => {
    if (
      !hasShareIntent ||
      !shareIntent
    ) {
      return;
    }

    void handleShareIntent();
  }, [
    hasShareIntent,
    shareIntent,
  ]);

  async function handleShareIntent():
  Promise<void> {
    try {
      const sharedValue =
        resolveSharedUrl(
          shareIntent,
        );

      if (
        sharedValue &&
        isValidDiscoveryUrl(
          sharedValue,
        )
      ) {
        await importContent(
          sharedValue,
        );

        Alert.alert(
          "In SaveWise gespeichert",
          "Der geteilte Link wurde analysiert und deinem Wissensuniversum hinzugefügt.",
        );

        router.replace(
          "/(tabs)",
        );

        return;
      }

      Alert.alert(
        "Geteilter Inhalt empfangen",
        "SaveWise hat den Inhalt erhalten. Bilder, PDFs und freien Text verbinden wir im nächsten Schritt direkt mit dem Capture Hub.",
      );
    } catch (shareError) {
      Alert.alert(
        "Import fehlgeschlagen",
        shareError instanceof Error
          ? shareError.message
          : "Der geteilte Inhalt konnte nicht importiert werden.",
      );
    } finally {
      resetShareIntent();
    }
  }

  return null;
}

function resolveSharedUrl(
  shareIntent:
    unknown,
): string | null {
  if (
    typeof shareIntent !==
      "object" ||
    shareIntent ===
      null
  ) {
    return null;
  }

  const value =
    shareIntent as
      Record<
        string,
        unknown
      >;

  const candidates = [
    value.webUrl,
    value.text,
  ];

  for (
    const candidate
    of candidates
  ) {
    if (
      typeof candidate ===
      "string" &&
      candidate.trim()
    ) {
      const match =
        candidate.match(
          /https?:\/\/[^\s]+/i,
        );

      if (match?.[0]) {
        return match[0];
      }

      return candidate.trim();
    }
  }

  return null;
}
