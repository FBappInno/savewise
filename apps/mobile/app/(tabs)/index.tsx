import {
  useEffect,
  useState,
} from "react";

import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CaptureModal } from "@/components/capture-modal";
import { DiscoveryCard } from "@/components/discovery-card";
import { SaveWiseButton } from "@/components/savewise-button";
import { SearchBar } from "@/components/search-bar";
import { localDiscoveryRepository } from "@/repositories/local-discovery-repository";
import {
  detectDiscoverySource,
  importContent,
} from "@/services/content-import-client";
import { theme } from "@/theme";
import type { CapturedItem } from "@/types/captured-item";
import type { Discovery } from "@/types/discovery";

export default function HomeScreen() {
  const [
    discoveries,
    setDiscoveries,
  ] = useState<Discovery[]>([]);

  const [
    isRepositoryReady,
    setRepositoryReady,
  ] = useState(false);

  const [
    isCaptureModalVisible,
    setCaptureModalVisible,
  ] = useState(false);

  useEffect(() => {
    async function initializeDiscoveries() {
      const storedDiscoveries =
        await localDiscoveryRepository.getAll();

      setDiscoveries(
        storedDiscoveries,
      );

      setRepositoryReady(true);
    }

    void initializeDiscoveries();
  }, []);

  useEffect(() => {
    if (!isRepositoryReady) {
      return;
    }

    void localDiscoveryRepository.saveAll(
      discoveries,
    );
  }, [
    discoveries,
    isRepositoryReady,
  ]);

  function handleDiscoveryPress(
    discovery: Discovery,
  ) {
    console.log(
      "Discovery pressed:",
      discovery.id,
    );
  }

  function handleCapture() {
    setCaptureModalVisible(true);
  }

  async function handleSaveCapture(
    capturedItem: CapturedItem,
  ) {
    const now = new Date().toISOString();

    const temporaryDiscovery: Discovery = {
      id: capturedItem.id,

      title: "Analyzing content...",

      source:
        capturedItem.source,

      url:
        capturedItem.url,

      topics: [],

      keywords: [],
createdAt: now,
updatedAt: now,
      savedAtLabel: "Just now",
    };

    setDiscoveries(
      (currentDiscoveries) => [
        temporaryDiscovery,
        ...currentDiscoveries,
      ],
    );

    try {
      const result =
        await importContent(
          capturedItem.url,
        );

      const classification =
        result.analysis.classification;

      const analyzedDiscovery: Discovery = {
        id: capturedItem.id,

        title:
          result.analysis.improvedTitle,

        source:
          detectDiscoverySource(
            result.metadata.url,
          ),

        url:
          result.metadata.url,

        description:
          result.metadata.description,

        summary:
          result.analysis.summary,

        thumbnailUrl:
          result.metadata.thumbnailUrl,

        author:
          result.metadata.author,

        publishedAt:
          result.metadata.publishedAt,

        classification,

        topics: [
          classification.topic,
          ...classification.subtopics,
        ],

        keywords:
          result.analysis.keywords,

        language:
          result.analysis.language,

        confidence:
          result.analysis.confidence,
createdAt: temporaryDiscovery.createdAt,
updatedAt: new Date().toISOString(),
        savedAtLabel: "Just now",
      };

      setDiscoveries(
        (currentDiscoveries) =>
          currentDiscoveries.map(
            (discovery) =>
              discovery.id ===
              analyzedDiscovery.id
                ? analyzedDiscovery
                : discovery,
          ),
      );
    } catch (error) {
      console.error(
        "Content analysis failed:",
        error,
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error";

      setDiscoveries(
        (currentDiscoveries) =>
          currentDiscoveries.map(
            (discovery) =>
              discovery.id ===
              capturedItem.id
                ? {
                    ...discovery,

                    title:
                      capturedItem.title,

                    description:
                      errorMessage,

                    topics: [
                      "Analysis failed",
                    ],

                    keywords: [],
                  }
                : discovery,
          ),
      );
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View style={styles.header}>
          <Text style={styles.logo}>
            SaveWise
          </Text>

          <Text style={styles.subtitle}>
            Your personal knowledge
            assistant
          </Text>
        </View>

        <SearchBar
          placeholder={
            "Search your discoveries..."
          }
        />

        <View style={styles.section}>
          <Text
            style={
              styles.sectionTitle
            }
          >
            Today&apos;s discoveries
          </Text>

          <View
            style={
              styles.discoveryList
            }
          >
            {discoveries.map(
              (discovery) => (
                <DiscoveryCard
                  key={discovery.id}
                  discovery={
                    discovery
                  }
                  onPress={
                    handleDiscoveryPress
                  }
                />
              ),
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <SaveWiseButton
          label="+ Capture"
          onPress={handleCapture}
        />
      </View>

      <CaptureModal
        visible={
          isCaptureModalVisible
        }
        onClose={() =>
          setCaptureModalVisible(
            false,
          )
        }
        onSave={
          handleSaveCapture
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,

    backgroundColor:
      theme.colors.background,
  },

  scrollContent: {
    paddingHorizontal:
      theme.spacing.xl,

    paddingTop:
      theme.spacing.xxxl,

    paddingBottom:
      theme.spacing.xl,
  },

  header: {
    alignItems: "center",

    marginBottom:
      theme.spacing.xxl,
  },

  logo: {
    ...theme.typography.screenTitle,

    color:
      theme.colors.text,
  },

  subtitle: {
    ...theme.typography.body,

    color:
      theme.colors.textSecondary,

    marginTop:
      theme.spacing.sm,

    textAlign: "center",
  },

  section: {
    marginTop:
      theme.spacing.xxl,
  },

  sectionTitle: {
    ...theme.typography.sectionTitle,

    color:
      theme.colors.text,

    marginBottom:
      theme.spacing.lg,
  },

  discoveryList: {
    gap:
      theme.spacing.lg,
  },

  footer: {
    backgroundColor:
      theme.colors.background,

    paddingHorizontal:
      theme.spacing.xl,

    paddingTop:
      theme.spacing.sm,

    paddingBottom:
      theme.spacing.xl,
  },
});