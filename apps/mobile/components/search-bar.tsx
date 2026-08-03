import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { theme } from "@/theme";

type SearchBarProps = TextInputProps;

export function SearchBar({
  placeholder = "Search your knowledge...",
  ...props
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Search your knowledge"
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        returnKeyType="search"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },

  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
});