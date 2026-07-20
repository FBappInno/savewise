export interface IntelligenceService {
  summarize(text: string): Promise<string>;

  categorize(text: string): Promise<string[]>;

  findConnections(id: string): Promise<string[]>;

  suggestCollections(): Promise<string[]>;
}