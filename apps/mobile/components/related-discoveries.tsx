import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getRelatedDiscoveries,
  type RelatedDiscovery,
} from "@/services/content-import-client";
import { theme } from "@/theme";
import type { Discovery } from "@/types/discovery";

type RelatedDiscoveriesProps = {
  discoveryId: string;

  onSelectDiscovery: (
    discovery: Discovery,
  ) => void;
};

export function RelatedDiscoveries({
  discoveryId,
  onSelectDiscovery,
}: RelatedDiscoveriesProps) {
  const [items, setItems] = useState<
    RelatedDiscovery[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState<
    string | null
  >(null);

  const loadRelated =
    useCallback(async () => {
      if (!discoveryId) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      setError(null);
      setIsLoading(true);

      try {
        const result =
          await getRelatedDiscoveries(
            discoveryId,
            5,
          );

        setItems(result.related);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Related discoveries could not be loaded.",
        );
      } finally {
        setIsLoading(false);
      }
    }, [discoveryId]);

  useEffect(() => {
    void loadRelated();
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
      <Text style={styles.eyebrow}>
        CONNECTIONS
      </Text>

      <Text style={styles.title}>
        Related discoveries
      </Text>

      <View style={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.discovery.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.discovery.title}`}
            onPress={() => {
              onSelectDiscovery(
                item.discovery,
              );
            }}
            style={({ pressed }) => [
              styles.card,
              pressed &&
                styles.pressed,
            ]}
          >
            <Text style={styles.cardTitle}>
              {item.discovery
                .improvedTitle ||
                item.discovery.title}
            </Text>

            <Text style={styles.matchText}>
              {Math.round(
                item.score * 100,
              )}
              % thematic match
            </Text>

            {item.reasons.length > 0 ? (
              <View
                style={
                  styles.reasonContainer
                }
              >
                {item.reasons
                  .slice(0, 3)
                  .map((reason) => (
                    <View
                      key={reason}
                      style={
                        styles.reasonChip
                      }
                    >
                      <Text
                        style={
                          styles.reasonText
                        }
                      >
                        {reason}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop:
      theme.spacing.xxxl,
  },

  loadingContainer: {
    alignItems: "center",
    paddingVertical:
      theme.spacing.xxl,
  },

  eyebrow: {
    ...theme.typography.caption,
    color:
      theme.colors.textSecondary,
    letterSpacing: 1.2,
    marginBottom:
      theme.spacing.xs,
  },

  title: {
    ...theme.typography.sectionTitle,
    color:
      theme.colors.text,
    marginBottom:
      theme.spacing.lg,
  },

  list: {
    gap:
      theme.spacing.md,
  },

  card: {
    backgroundColor:
      theme.colors.surface,
    borderColor:
      theme.colors.border,
    borderRadius:
      theme.radius.lg,
    borderWidth: 1,
    padding:
      theme.spacing.lg,
  },

  pressed: {
    opacity: 0.7,
  },

  cardTitle: {
    ...theme.typography.bodyStrong,
    color:
      theme.colors.text,
  },

  matchText: {
    ...theme.typography.caption,
    color:
      theme.colors.textSecondary,
    marginTop:
      theme.spacing.sm,
  },

  reasonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap:
      theme.spacing.sm,
    marginTop:
      theme.spacing.md,
  },

  reasonChip: {
    backgroundColor:
      theme.colors.background,
    borderRadius: 999,
    paddingHorizontal:
      theme.spacing.sm,
    paddingVertical:
      theme.spacing.xs,
  },

  reasonText: {
    ...theme.typography.caption,
    color:
      theme.colors.textSecondary,
  },
});