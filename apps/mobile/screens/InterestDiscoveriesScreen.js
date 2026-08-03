import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getInterestDiscoveries } from "../api/savewiseApi";

function DiscoveryItem({ discovery, onPress }) {
  const analysis =
    discovery.analysis ?? discovery.aiAnalysis ?? discovery;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.discoveryCard,
        pressed && styles.pressed,
      ]}
      onPress={() => onPress?.(discovery)}
    >
      <Text style={styles.discoveryTitle}>
        {analysis.improvedTitle ||
          discovery.title ||
          "Unbenannte Discovery"}
      </Text>

      {analysis.summary ? (
        <Text style={styles.discoverySummary} numberOfLines={3}>
          {analysis.summary}
        </Text>
      ) : null}

      <View style={styles.metadataRow}>
        {analysis.topic ? (
          <Text style={styles.metadataText}>
            {analysis.topic}
          </Text>
        ) : null}

        {discovery.createdAt ? (
          <Text style={styles.metadataText}>
            {new Date(discovery.createdAt).toLocaleDateString(
              "de-CH"
            )}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function InterestDiscoveriesScreen({
  route,
  navigation,
}) {
  const { interestKey, interestLabel } = route.params;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const result = await getInterestDiscoveries(interestKey);
      setData(result);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setIsLoading(false);
    }
  }, [interestKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openDiscovery(discovery) {
    navigation.navigate("DiscoveryDetail", {
      discoveryId: discovery.id,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {isLoading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={data?.discoveries ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          refreshing={isLoading}
          onRefresh={loadData}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.eyebrow}>
                ERKANNTES INTERESSE
              </Text>

              <Text style={styles.title}>{interestLabel}</Text>

              <Text style={styles.subtitle}>
                {data?.discoveries?.length ?? 0} passende
                Discoveries
              </Text>

              {error ? (
                <Text style={styles.error}>{error.message}</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                Keine passenden Discoveries
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <DiscoveryItem
              discovery={item}
              onPress={openDiscovery}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 20,
  },

  eyebrow: {
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#889096",
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#11181C",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    color: "#687076",
  },

  error: {
    marginTop: 12,
    color: "#9B1C1C",
  },

  discoveryCard: {
    marginBottom: 10,
    padding: 17,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  pressed: {
    opacity: 0.7,
  },

  discoveryTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "#11181C",
  },

  discoverySummary: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#5A6168",
  },

  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },

  metadataText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#889096",
  },

  emptyCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#11181C",
  },
});