import { Ionicons } from "@expo/vector-icons";

import {
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { universeTheme } from "@/theme/universe-theme";

type SearchBarProps =
  TextInputProps & {
    onClear?: () => void;
  };

export function SearchBar({
  placeholder = "Durchsuche dein Universum …",
  value,
  onClear,
  ...props
}: SearchBarProps) {
  const hasValue =
    typeof value === "string" &&
    value.length > 0;

  return (
    <View style={styles.container}>
      <Ionicons
        color={
          universeTheme.colors.primary
        }
        name="search-outline"
        size={20}
      />

      <TextInput
        accessibilityLabel="Wissen durchsuchen"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        placeholderTextColor={
          universeTheme.colors.textMuted
        }
        returnKeyType="search"
        selectionColor={
          universeTheme.colors.primaryBright
        }
        style={styles.input}
        value={value}
        {...props}
      />

      {hasValue && onClear ? (
        <Pressable
          accessibilityLabel="Suche löschen"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onClear}
          style={({ pressed }) => [
            styles.clearButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            color={
              universeTheme.colors
                .textSecondary
            }
            name="close-circle"
            size={20}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",

    backgroundColor:
      "rgba(6, 20, 36, 0.92)",

    borderColor:
      universeTheme.colors.borderStrong,

    borderRadius:
      universeTheme.radius.lg,

    borderWidth: 1,

    flexDirection: "row",

    gap: 10,

    minHeight: 54,

    paddingHorizontal: 16,

    shadowColor:
      universeTheme.colors.primary,

    shadowOffset: {
      height: 0,
      width: 0,
    },

    shadowOpacity: 0.18,

    shadowRadius: 14,
  },

  input: {
    color:
      universeTheme.colors.text,

    flex: 1,

    fontSize: 15,

    lineHeight: 21,

    paddingVertical: 14,
  },

  clearButton: {
    alignItems: "center",

    height: 34,

    justifyContent: "center",

    width: 34,
  },

  pressed: {
    opacity: 0.62,
  },
});