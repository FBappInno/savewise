import { Ionicons } from "@expo/vector-icons";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";

import { universeTheme } from "@/theme/universe-theme";

type SaveWiseButtonProps =
  PressableProps & {
    label: string;

    icon?: keyof typeof Ionicons.glyphMap;

    loading?: boolean;

    variant?:
      | "primary"
      | "secondary";
  };

export function SaveWiseButton({
  label,
  icon = "sparkles-outline",
  loading = false,
  variant = "primary",
  disabled,
  style,
  ...props
}: SaveWiseButtonProps) {
  const isDisabled =
    disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.button,

        variant === "primary"
          ? styles.primaryButton
          : styles.secondaryButton,

        state.pressed &&
          !isDisabled &&
          styles.pressed,

        isDisabled &&
          styles.disabled,

        typeof style === "function"
          ? style(state)
          : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary"
              ? "#03111E"
              : universeTheme.colors
                  .primaryBright
          }
          size="small"
        />
      ) : (
        <Ionicons
          color={
            variant === "primary"
              ? "#03111E"
              : universeTheme.colors
                  .primaryBright
          }
          name={icon}
          size={19}
        />
      )}

      <Text
        style={[
          styles.label,

          variant === "primary"
            ? styles.primaryLabel
            : styles.secondaryLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    flexDirection: "row",

    gap: 9,

    justifyContent: "center",

    minHeight: 56,

    paddingHorizontal: 22,

    paddingVertical: 15,
  },

  primaryButton: {
    backgroundColor:
      universeTheme.colors
        .primaryBright,

    borderColor:
      universeTheme.colors
        .primaryBright,

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.55,

    shadowRadius: 18,
  },

  secondaryButton: {
    backgroundColor:
      "rgba(56, 189, 248, 0.07)",

    borderColor:
      universeTheme.colors.borderStrong,
  },

  pressed: {
    opacity: 0.72,

    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  disabled: {
    opacity: 0.42,
  },

  label: {
    fontSize: 15,

    fontWeight: "800",

    letterSpacing: 0.2,
  },

  primaryLabel: {
    color: "#03111E",
  },

  secondaryLabel: {
    color:
      universeTheme.colors
        .primaryBright,
  },
});