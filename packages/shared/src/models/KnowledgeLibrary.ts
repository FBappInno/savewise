import type { Discovery } from "./Discovery";
import type {
  Insight,
  KnowledgeActivity,
} from "./Insight";
import type { Interest } from "./Interest";
import type { KnowledgeNode } from "./KnowledgeNode";
import type { Relation } from "./Relation";
import type { Topic } from "./Topic";

export interface KnowledgeLibrary {
  generatedAt: string;

  discoveries: Discovery[];

  topics: Topic[];

  interests: Interest[];

  nodes: KnowledgeNode[];

  relations: Relation[];

  insights: Insight[];

  activity: KnowledgeActivity;
}