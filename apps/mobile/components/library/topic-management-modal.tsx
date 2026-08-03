import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppSettings } from "@/providers/app-settings-provider";
import { theme } from "@/theme";
import type { KnowledgeGraph, KnowledgeGraphNode } from "@savewise/shared";

type TopicManagementModalProps = {
  graph: KnowledgeGraph;
  visible: boolean;
  onClose: () => void;
  onSave: (nodeId: string, update: {
    title: string;
    parentId: string | null;
  }) => Promise<void>;
};

export function TopicManagementModal({
  graph,
  visible,
  onClose,
  onSave,
}: TopicManagementModalProps) {
  const { t } = useAppSettings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [showParents, setShowParents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nodesById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const selectedNode = selectedId ? nodesById.get(selectedId) : undefined;
  const excludedParentIds = selectedNode
    ? collectDescendantIds(selectedNode, nodesById)
    : new Set<string>();
  const parentOptions = graph.nodes
    .filter((node) => node.id !== selectedId && !excludedParentIds.has(node.id))
    .sort((left, right) => left.title.localeCompare(right.title));

  useEffect(() => {
    if (!visible) {
      setSelectedId(null);
      setError(null);
      setShowParents(false);
    }
  }, [visible]);

  function selectNode(node: KnowledgeGraphNode) {
    setSelectedId(node.id);
    setTitle(node.title);
    setParentId(node.parentId);
    setShowParents(false);
    setError(null);
  }

  async function save() {
    if (!selectedNode || title.trim().length < 2) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(selectedNode.id, { title: title.trim(), parentId });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("library.topicUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={selectedNode ? () => setSelectedId(null) : onClose}>
            <Text style={styles.headerAction}>
              {selectedNode ? t("navigation.back") : t("discovery.cancel")}
            </Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t("library.manageTopics")}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {!selectedNode ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.intro}>{t("library.manageTopicsDescription")}</Text>
            <View style={styles.topicList}>
              {graph.nodes
                .slice()
                .sort((left, right) => nodeDepth(left, nodesById) - nodeDepth(right, nodesById) || left.title.localeCompare(right.title))
                .map((node) => (
                  <Pressable
                    accessibilityRole="button"
                    key={node.id}
                    onPress={() => selectNode(node)}
                    style={({ pressed }) => [styles.topicRow, pressed && styles.pressed]}
                  >
                    <View style={[styles.depthMark, { marginLeft: Math.min(nodeDepth(node, nodesById), 3) * 12 }]} />
                    <View style={styles.topicRowContent}>
                      <Text style={styles.topicName}>{node.title}</Text>
                      <Text style={styles.topicMeta}>
                        {node.discoveryIds.length} · {formatPath(node, nodesById)}
                      </Text>
                    </View>
                    <Ionicons color={theme.colors.placeholder} name="chevron-forward" size={18} />
                  </Pressable>
                ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{t("library.topicName")}</Text>
            <TextInput
              autoCorrect={false}
              maxLength={80}
              onChangeText={setTitle}
              style={styles.input}
              value={title}
            />

            <Text style={styles.fieldLabel}>{t("library.parentTopic")}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowParents((current) => !current)}
              style={styles.selector}
            >
              <Text numberOfLines={2} style={styles.selectorText}>
                {parentId ? nodesById.get(parentId)?.title : t("library.topLevel")}
              </Text>
              <Ionicons
                color={theme.colors.textSecondary}
                name={showParents ? "chevron-up" : "chevron-down"}
                size={18}
              />
            </Pressable>

            {showParents ? (
              <View style={styles.parentList}>
                <ParentOption
                  label={t("library.topLevel")}
                  onPress={() => { setParentId(null); setShowParents(false); }}
                  selected={parentId === null}
                />
                {parentOptions.map((node) => (
                  <ParentOption
                    key={node.id}
                    label={formatPath(node, nodesById)}
                    onPress={() => { setParentId(node.id); setShowParents(false); }}
                    selected={parentId === node.id}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.note}>
              <Ionicons color={theme.colors.primary} name="shield-checkmark-outline" size={20} />
              <Text style={styles.noteText}>{t("library.manualTopicHint")}</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSaving || title.trim().length < 2}
              onPress={() => void save()}
              style={({ pressed }) => [
                styles.saveButton,
                (pressed || isSaving) && styles.pressed,
              ]}
            >
              {isSaving ? <ActivityIndicator color={theme.colors.textOnPrimary} /> : null}
              <Text style={styles.saveText}>
                {isSaving ? t("discovery.saving") : t("discovery.save")}
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function ParentOption({ label, selected, onPress }: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.parentOption}>
      <Text style={[styles.parentText, selected && styles.parentTextSelected]}>{label}</Text>
      {selected ? <Ionicons color={theme.colors.primary} name="checkmark" size={18} /> : null}
    </Pressable>
  );
}

function collectDescendantIds(
  node: KnowledgeGraphNode,
  nodesById: Map<string, KnowledgeGraphNode>,
): Set<string> {
  const ids = new Set<string>();
  const visit = (current: KnowledgeGraphNode) => {
    for (const childId of current.childIds) {
      if (ids.has(childId)) continue;
      ids.add(childId);
      const child = nodesById.get(childId);
      if (child) visit(child);
    }
  };
  visit(node);
  return ids;
}

function nodeDepth(node: KnowledgeGraphNode, nodesById: Map<string, KnowledgeGraphNode>): number {
  let depth = 0;
  let current = node;
  const visited = new Set<string>();
  while (current.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = nodesById.get(current.parentId);
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
}

function formatPath(node: KnowledgeGraphNode, nodesById: Map<string, KnowledgeGraphNode>): string {
  const labels = [node.title];
  let current = node;
  const visited = new Set<string>();
  while (current.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = nodesById.get(current.parentId);
    if (!parent) break;
    labels.unshift(parent.title);
    current = parent;
  }
  return labels.join(" › ");
}

const styles = StyleSheet.create({
  screen: { backgroundColor: theme.colors.background, flex: 1 },
  header: {
    alignItems: "center", backgroundColor: theme.colors.surface,
    borderBottomColor: theme.colors.border, borderBottomWidth: 1,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  headerAction: { ...theme.typography.body, color: theme.colors.primary, fontWeight: "600", width: 92 },
  headerTitle: { ...theme.typography.sectionTitle, color: theme.colors.text, textAlign: "center" },
  headerSpacer: { width: 92 },
  content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  intro: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: theme.spacing.lg },
  topicList: { gap: theme.spacing.sm },
  topicRow: {
    alignItems: "center", backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border, borderRadius: theme.radius.md,
    borderWidth: 1, flexDirection: "row", minHeight: 68,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  depthMark: { backgroundColor: theme.colors.primary, borderRadius: 99, height: 28, marginRight: theme.spacing.sm, width: 3 },
  topicRowContent: { flex: 1 },
  topicName: { ...theme.typography.body, color: theme.colors.text, fontWeight: "700" },
  topicMeta: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 3 },
  fieldLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: "700", marginBottom: theme.spacing.xs, marginTop: theme.spacing.md },
  input: {
    ...theme.typography.body, backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border, borderRadius: theme.radius.md,
    borderWidth: 1, color: theme.colors.text, padding: theme.spacing.md,
  },
  selector: {
    alignItems: "center", backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border, borderRadius: theme.radius.md,
    borderWidth: 1, flexDirection: "row", justifyContent: "space-between",
    minHeight: 52, padding: theme.spacing.md,
  },
  selectorText: { ...theme.typography.body, color: theme.colors.text, flex: 1, marginRight: theme.spacing.sm },
  parentList: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.md, borderWidth: 1, marginTop: theme.spacing.sm },
  parentOption: { alignItems: "center", borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", minHeight: 48, padding: theme.spacing.md },
  parentText: { ...theme.typography.caption, color: theme.colors.textSecondary, flex: 1 },
  parentTextSelected: { color: theme.colors.primary, fontWeight: "700" },
  note: { alignItems: "flex-start", backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.xl, padding: theme.spacing.md },
  noteText: { ...theme.typography.caption, color: theme.colors.textSecondary, flex: 1, lineHeight: 18 },
  error: { ...theme.typography.caption, color: theme.colors.danger, marginTop: theme.spacing.md },
  saveButton: { alignItems: "center", backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, flexDirection: "row", gap: theme.spacing.sm, justifyContent: "center", marginTop: theme.spacing.xl, minHeight: 52, padding: theme.spacing.md },
  saveText: { ...theme.typography.body, color: theme.colors.textOnPrimary, fontWeight: "700" },
  pressed: { opacity: 0.65 },
});
