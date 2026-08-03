import type { Discovery } from "@/types/discovery";

const DEMO_CREATED_AT = "2026-07-01T10:00:00.000Z";

export const discoveries: Discovery[] = [
  {
    id: "discovery-1",
    title: "Modern React and TypeScript Patterns",
    source: "youtube",
    savedAtLabel: "2 days ago",
    topics: ["React", "TypeScript"],
    keywords: [],
    createdAt: DEMO_CREATED_AT,
    updatedAt: DEMO_CREATED_AT,
  },
  {
    id: "discovery-2",
    title: "Long-term Investing Fundamentals",
    source: "instagram",
    savedAtLabel: "5 days ago",
    topics: ["Investing", "Finance"],
    keywords: [],
    createdAt: DEMO_CREATED_AT,
    updatedAt: DEMO_CREATED_AT,
  },
];