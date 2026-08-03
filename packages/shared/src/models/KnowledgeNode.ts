import type {
  KnowledgeGraphNodeKind,
} from "./KnowledgeGraph";

export interface KnowledgeNode {
  id: string;

  title: string;

  category: string;

  kind?: KnowledgeGraphNodeKind;

  description?: string;

  parentId?: string | null;

  discoveries: string[];

  children: string[];

  aliases?: string[];

  keywords?: string[];

  confidence?: number;
}