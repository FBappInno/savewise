import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useKnowledgeLibrary } from "../hooks/useKnowledgeLibrary";

function StatisticCard({ value, label }) {
  return (
    <View style={styles.statisticCard}>
      <Text style={styles.statisticValue}>{value}</Text>
      <Text style={styles.statisticLabel}>{label}</Text>
    </View>
  );
}

function InterestCard({ interest, onPress }) {
  const strengthPercentage = Math.round(interest.strength * 100);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.interestCard,
        pressed && styles.pressed,
      ]}
      onPress={() => onPress?.(interest)}
    >
      <View style={styles.interestHeader}>
        <Text style={styles.interestRank}>#{interest.rank}</Text>
        <Text style={styles.interestTitle}>{interest.label}</Text>
        <Text style={styles.interestCount}>{interest.count}</Text>
      </View>

      <View style={styles.strengthTrack}>
        <View
          style={[
            styles.strengthFill,
            {
              width: `${Math.max(strengthPercentage, 4)}%`,
            },
          ]}
        />
      </View>

      <Text style={styles.interestMeta}>
        Interessenstärke {strengthPercentage} %
      </Text>
    </Pressable>
  );
}

function TrendCard({ trend }) {
  return (
    <View style={styles.trendCard}>
      <View style={styles.trendTextContainer}>
        <Text style={styles.trendTitle}>{trend.label}</Text>
        <Text style={styles.trendMeta}>
          {trend.currentCount} neue Inhalte in den letzten 14 Tagen
        </Text>
      </View>

      <View style={styles.growthBadge}>
        <Text style={styles.growthBadgeText}>
          +{trend.absoluteGrowth}
        </Text>
      </View>
    </View>
  );
}

export default function KnowledgeLibraryScreen({ navigation }) {
  const {
    library,
    isLoading,
    isRebuilding,
    error,
    reload,
    rebuild,
  } = useKnowledgeLibrary();

  async function handleRebuild() {
    try {
      await rebuild();
    } catch {
      // Fehlermeldung wird über den Hook angezeigt.
    }
  }

  function handleInterestPress(interest) {
    navigation?.navigate("InterestDiscoveries", {
      interestKey: interest.key,
      interestLabel: interest.label,
    });
  }

  if (isLoading && !library) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Wissensbibliothek wird aufgebaut …
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
          />
        }
      >
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.eyebrow}>SAVEWISE</Text>
            <Text style={styles.title}>
              Deine Wissensbibliothek
            </Text>
            <Text style={styles.subtitle}>
              Automatisch aus deinen gespeicherten Discoveries
              aufgebaut.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.rebuildButton,
              pressed && styles.pressed,
            ]}
            disabled={isRebuilding}
            onPress={handleRebuild}
          >
            {isRebuilding ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={styles.rebuildButtonText}>↻</Text>
            )}
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>
              Bibliothek konnte nicht geladen werden
            </Text>
            <Text style={styles.errorMessage}>
              {error.message}
            </Text>
          </View>
        ) : null}

        <View style={styles.statisticsGrid}>
          <StatisticCard
            value={library?.statistics?.totalDiscoveries ?? 0}
            label="Discoveries"
          />

          <StatisticCard
            value={library?.statistics?.totalTopics ?? 0}
            label="Themen"
          />

          <StatisticCard
            value={library?.statistics?.totalRelations ?? 0}
            label="Verbindungen"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>
            PERSÖNLICHES PROFIL
          </Text>
          <Text style={styles.sectionTitle}>
            Deine stärksten Interessen
          </Text>

          <View style={styles.cardList}>
            {(library?.interests ?? [])
              .slice(0, 8)
              .map((interest) => (
                <InterestCard
                  key={interest.key}
                  interest={interest}
                  onPress={handleInterestPress}
                />
              ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>
            WISSENSGEBIETE
          </Text>
          <Text style={styles.sectionTitle}>Kategorien</Text>

          <View style={styles.chipContainer}>
            {(library?.categories ?? [])
              .slice(0, 15)
              .map((category) => (
                <View style={styles.chip} key={category.key}>
                  <Text style={styles.chipText}>
                    {category.label}
                  </Text>
                  <Text style={styles.chipCount}>
                    {category.count}
                  </Text>
                </View>
              ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>
            ENTWICKLUNG
          </Text>
          <Text style={styles.sectionTitle}>
            Deine aktuellen Trends
          </Text>

          {(library?.trends ?? []).length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                Noch keine stabilen Trends
              </Text>
              <Text style={styles.emptyText}>
                Sobald mehrere neue Discoveries zu ähnlichen
                Themen gespeichert wurden, erscheinen sie hier.
              </Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {library.trends.slice(0, 8).map((trend) => (
                <TrendCard key={trend.key} trend={trend} />
              ))}
            </View>
          )}
        </View>

        {library?.generatedAt ? (
          <Text style={styles.generatedAt}>
            Aktualisiert am{" "}
            {new Date(library.generatedAt).toLocaleString("de-CH")}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },

  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F4F5F7",
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: "#60646C",
  },

  content: {
    padding: 20,
    paddingBottom: 48,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 22,
  },

  titleContainer: {
    flex: 1,
    paddingRight: 16,
  },

  eyebrow: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#687076",
  },

  title: {
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "800",
    color: "#11181C",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: "#687076",
  },

  rebuildButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  rebuildButtonText: {
    fontSize: 23,
    fontWeight: "600",
    color: "#11181C",
  },

  pressed: {
    opacity: 0.7,
  },

  errorBox: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FDECEC",
  },

  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9B1C1C",
  },

  errorMessage: {
    marginTop: 4,
    fontSize: 14,
    color: "#9B1C1C",
  },

  statisticsGrid: {
    flexDirection: "row",
    gap: 10,
  },

  statisticCard: {
    flex: 1,
    minHeight: 100,
    padding: 14,
    borderRadius: 18,
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },

  statisticValue: {
    fontSize: 27,
    fontWeight: "800",
    color: "#11181C",
  },

  statisticLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#687076",
  },

  section: {
    marginTop: 32,
  },

  sectionEyebrow: {
    marginBottom: 5,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#889096",
  },

  sectionTitle: {
    marginBottom: 14,
    fontSize: 22,
    fontWeight: "800",
    color: "#11181C",
  },

  cardList: {
    gap: 10,
  },

  interestCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  interestHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  interestRank: {
    width: 34,
    fontSize: 13,
    fontWeight: "700",
    color: "#889096",
  },

  interestTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#11181C",
  },

  interestCount: {
    minWidth: 30,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "700",
    color: "#687076",
  },

  strengthTrack: {
    height: 6,
    marginTop: 14,
    overflow: "hidden",
    borderRadius: 3,
    backgroundColor: "#ECEEF0",
  },

  strengthFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#11181C",
  },

  interestMeta: {
    marginTop: 8,
    fontSize: 11,
    color: "#889096",
  },

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },

  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#30353B",
  },

  chipCount: {
    marginLeft: 7,
    fontSize: 11,
    fontWeight: "700",
    color: "#889096",
  },

  trendCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  trendTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  trendTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#11181C",
  },

  trendMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#687076",
  },

  growthBadge: {
    minWidth: 45,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#E8F5E9",
  },

  growthBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#237A3B",
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

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#687076",
  },

  generatedAt: {
    marginTop: 36,
    textAlign: "center",
    fontSize: 11,
    color: "#A0A4A8",
  },
});