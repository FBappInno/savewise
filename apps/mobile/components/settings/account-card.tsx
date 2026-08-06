import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { universeTheme } from "@/theme/universe-theme";

import type {
  AppSettings,
} from "@/types/app-settings";

type AccountCardProps = {
  account: AppSettings["account"];
  activeWorkspaceId:
    AppSettings["workspace"]["activeId"];
};

export function AccountCard({
  account,
  activeWorkspaceId,
}: AccountCardProps) {
  const isSignedIn =
    account.hasPassword;

  const isBusiness =
    activeWorkspaceId ===
    "business";

  return (
    <View>
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(
                account.username,
                account.email,
              )}
            </Text>
          </View>

          <View style={styles.profileText}>
            <Text style={styles.name}>
              {account.username.trim() ||
                "SaveWise Benutzer"}
            </Text>

            <Text style={styles.email}>
              {account.email.trim() ||
                "Noch kein Konto verbunden"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,

              isSignedIn
                ? styles.statusBadgeActive
                : styles.statusBadgeInactive,
            ]}
          >
            <Ionicons
              color={
                isSignedIn
                  ? universeTheme.colors.green
                  : universeTheme.colors.yellow
              }
              name={
                isSignedIn
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={14}
            />

            <Text
              style={[
                styles.statusText,

                isSignedIn
                  ? styles.statusTextActive
                  : styles.statusTextInactive,
              ]}
            >
              {isSignedIn
                ? "ANGEMELDET"
                : "NICHT ANGEMELDET"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.workspaceRow}>
          <View
            style={[
              styles.workspaceIcon,

              isBusiness
                ? styles.workspaceIconBusiness
                : styles.workspaceIconPrivate,
            ]}
          >
            <Ionicons
              color={
                isBusiness
                  ? universeTheme.colors.violet
                  : universeTheme.colors
                      .primaryBright
              }
              name={
                isBusiness
                  ? "briefcase"
                  : "home"
              }
              size={18}
            />
          </View>

          <View style={styles.profileText}>
            <Text style={styles.workspaceLabel}>
              AKTIVER WORKSPACE
            </Text>

            <Text style={styles.workspaceName}>
              {isBusiness
                ? "Geschäftlich"
                : "Privat"}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Konto und Anmeldung öffnen"
        accessibilityRole="button"
        onPress={() => {
          router.push({
            pathname: "/account",
          } as never);
        }}
        style={({ pressed }) => [
          styles.action,

          pressed &&
            styles.pressed,
        ]}
      >
        <View style={styles.actionIcon}>
          <Ionicons
            color={
              universeTheme.colors
                .primaryBright
            }
            name="person-circle-outline"
            size={22}
          />
        </View>

        <View style={styles.profileText}>
          <Text style={styles.actionTitle}>
            Konto & Anmeldung
          </Text>

          <Text style={styles.actionDescription}>
            Konto erstellen, anmelden und Zugang verwalten.
          </Text>
        </View>

        <Ionicons
          color={
            universeTheme.colors
              .textMuted
          }
          name="chevron-forward"
          size={19}
        />
      </Pressable>
    </View>
  );
}

function getInitials(
  username: string,
  email: string,
): string {
  const source =
    username.trim() ||
    email
      .split("@")[0]
      ?.trim() ||
    "S";

  const parts =
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

  return parts
    .map(
      (part) =>
        part[0]?.toUpperCase() ??
        "",
    )
    .join("") || "S";
}

const styles =
  StyleSheet.create({
    profileCard: {
      backgroundColor:
        "rgba(3, 12, 24, 0.68)",
      borderColor:
        universeTheme.colors.border,
      borderRadius:
        universeTheme.radius.md,
      borderWidth: 1,
      padding: 14,
    },

    profileRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 11,
    },

    avatar: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.12)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius: 999,
      borderWidth: 1,
      height: 48,
      justifyContent: "center",
      width: 48,
    },

    avatarText: {
      color:
        universeTheme.colors
          .primaryBright,
      fontSize: 15,
      fontWeight: "900",
    },

    profileText: {
      flex: 1,
    },

    name: {
      color:
        universeTheme.colors.text,
      fontSize: 14,
      fontWeight: "900",
    },

    email: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      marginTop: 3,
    },

    statusBadge: {
      alignItems: "center",
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 5,
    },

    statusBadgeActive: {
      backgroundColor:
        "rgba(74, 222, 128, 0.08)",
      borderColor:
        "rgba(74, 222, 128, 0.28)",
    },

    statusBadgeInactive: {
      backgroundColor:
        "rgba(250, 204, 21, 0.07)",
      borderColor:
        "rgba(250, 204, 21, 0.25)",
    },

    statusText: {
      fontSize: 6,
      fontWeight: "900",
      letterSpacing: 0.45,
    },

    statusTextActive: {
      color:
        universeTheme.colors.green,
    },

    statusTextInactive: {
      color:
        universeTheme.colors.yellow,
    },

    divider: {
      backgroundColor:
        universeTheme.colors.border,
      height:
        StyleSheet.hairlineWidth,
      marginVertical: 13,
    },

    workspaceRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
    },

    workspaceIcon: {
      alignItems: "center",
      borderRadius: 11,
      borderWidth: 1,
      height: 38,
      justifyContent: "center",
      width: 38,
    },

    workspaceIconPrivate: {
      backgroundColor:
        "rgba(103, 232, 249, 0.08)",
      borderColor:
        "rgba(103, 232, 249, 0.25)",
    },

    workspaceIconBusiness: {
      backgroundColor:
        "rgba(139, 92, 246, 0.08)",
      borderColor:
        "rgba(139, 92, 246, 0.27)",
    },

    workspaceLabel: {
      color:
        universeTheme.colors
          .textMuted,
      fontSize: 7,
      fontWeight: "900",
      letterSpacing: 0.7,
    },

    workspaceName: {
      color:
        universeTheme.colors.text,
      fontSize: 12,
      fontWeight: "900",
      marginTop: 3,
    },

    action: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.07)",
      borderColor:
        universeTheme.colors
          .borderStrong,
      borderRadius:
        universeTheme.radius.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
      minHeight: 62,
      paddingHorizontal: 12,
    },

    actionIcon: {
      alignItems: "center",
      backgroundColor:
        "rgba(56, 189, 248, 0.11)",
      borderRadius: 11,
      height: 40,
      justifyContent: "center",
      width: 40,
    },

    actionTitle: {
      color:
        universeTheme.colors.text,
      fontSize: 12,
      fontWeight: "900",
    },

    actionDescription: {
      color:
        universeTheme.colors
          .textSecondary,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 3,
    },

    pressed: {
      opacity: 0.67,
    },
  });
