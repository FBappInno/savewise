import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getRelatedDiscoveries } from "../api/savewiseApi";

export default function RelatedDiscoveries({
  discoveryId,
  onSelectDiscovery,
}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRelated = useCallback(async () => {
    if (!discoveryId) {
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const result = await getRelatedDiscoveries(
        discoveryId,
        5
      );

      setItems(result.related ?? []);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setIsLoading(false);
    }
  }, [discoveryId]);

  useEffect(() => {
    loadRelated();
  }, [loadRelated]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (error || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>VERBINDUNGEN</Text>
      <Text style={styles.title}>Verwandte Inhalte</Text>

      <View style={styles.list}>
        {items.map(({ discovery, relation }) => {
          const analysis =
            discovery.analysis ??
            discovery.aiAnalysis ??
            discovery;

          return (
            <Pressable
              key={discovery.id}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                onSelectDiscovery?.(discovery)
              }
            >
              <Text style={styles.cardTitle}>
                {analysis.improvedTitle ||
                  discovery.title ||
                  "Unbenannte Discovery"}
              </Text>

              <Text style={styles.matchText}>
                {Math.round(relation.score * 100)} % thematische
                Übereinstimmung
              </Text>

              <View style={styles.featureContainer}>
                {relation.sharedFeatures
                  .slice(0, 3)
                  .map((feature) => (
                    <View
                      style={styles.featureChip}
                      key={`${feature.type}:${feature.value}`}
                    >
                      <Text style={styles.featureText}>
                        {feature.value}
                      </Text>
                    </View>
                  ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
  },

  loadingContainer: {
    paddingVertical: 24,
  },

  eyebrow: {
    marginBottom: 5,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#889096",
  },

  title: {
    marginBottom: 14,
    fontSize: 22,
    fontWeight: "800",
    color: "#11181C",
  },

  list: {
    gap: 10,
  },

  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  pressed: {
    opacity: 0.7,
  },

  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: "#11181C",
  },

  matchText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#687076",
  },

  featureContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 11,
  },

  featureChip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#F0F1F2",
  },

  featureText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#5A6168",
  },
});