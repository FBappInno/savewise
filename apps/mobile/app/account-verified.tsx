import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { StarBackground } from "@/components/universe-ui/star-background";
import { universeTheme } from "@/theme/universe-theme";

export default function AccountVerifiedScreen() {
  return (
    <View style={styles.screen}>
      <StarBackground density={75} />

      <View style={styles.content}>
        <View style={styles.icon}>
          <Ionicons
            color={universeTheme.colors.green}
            name="checkmark-circle"
            size={48}
          />
        </View>

        <Text style={styles.eyebrow}>
          KONTO BESTÄTIGT
        </Text>

        <Text style={styles.title}>
          Deine E-Mail ist bestätigt
        </Text>

        <Text style={styles.description}>
          Dein SaveWise-Konto wurde erfolgreich aktiviert.
          Du kannst dich jetzt mit deiner E-Mail-Adresse und
          deinem Passwort anmelden.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.replace({
              pathname: "/account",
              params: {
                mode: "login",
              },
            } as never);
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            color="#03111E"
            name="log-in-outline"
            size={19}
          />

          <Text style={styles.primaryButtonText}>
            Jetzt anmelden
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            /*
             * Der zentrale Auth-Gate verhindert
             * anschließend automatisch den Zugriff
             * auf SaveWise ohne gültige Session.
             */
            router.replace("/(tabs)" as never);
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>
            Später
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: universeTheme.colors.background,
    flex: 1,
  },

  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  icon: {
    alignItems: "center",
    backgroundColor: "rgba(74, 222, 128, 0.10)",
    borderColor: "rgba(74, 222, 128, 0.35)",
    borderRadius: 999,
    borderWidth: 1,
    height: 88,
    justifyContent: "center",
    width: 88,
  },

  eyebrow: {
    color: universeTheme.colors.green,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginTop: 25,
  },

  title: {
    color: universeTheme.colors.text,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 32,
    marginTop: 7,
    textAlign: "center",
  },

  description: {
    color: universeTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 12,
    maxWidth: 340,
    textAlign: "center",
  },

  primaryButton: {
    alignItems: "center",
    backgroundColor: universeTheme.colors.primaryBright,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 30,
    minHeight: 52,
    width: "100%",
  },

  primaryButtonText: {
    color: "#03111E",
    fontSize: 13,
    fontWeight: "900",
  },

  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    width: "100%",
  },

  secondaryButtonText: {
    color: universeTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.67,
  },
});
