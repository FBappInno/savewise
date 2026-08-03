import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from "react-native";

import { theme } from "@/theme";

type SaveWiseButtonProps =
  PressableProps & {
    label: string;
  };

export function SaveWiseButton({
  label,
  disabled,
  style,
  ...props
}: SaveWiseButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        state.pressed &&
          !disabled &&
          styles.pressed,
        disabled &&
          styles.disabled,
        typeof style === "function"
          ? style(state)
          : style,
      ]}
      {...props}
    >
      <Text style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor:
      theme.colors.primary,
    borderRadius:
      theme.radius.lg,
    paddingHorizontal:
      theme.spacing.xl,
    paddingVertical:
      theme.spacing.lg,
  },

  pressed: {
    backgroundColor:
      theme.colors.primaryPressed,
  },

  disabled: {
    opacity: 0.5,
  },

  label: {
    ...theme.typography.button,
    color:
      theme.colors.textOnPrimary,
  },
});