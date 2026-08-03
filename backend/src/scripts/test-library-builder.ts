import type { Discovery } from "@savewise/shared";

import { buildKnowledgeLibrary } from "../services/library/library-builder";

const discoveries: Discovery[] = [
  {
    id: "discovery-1",
    url: "https://example.com/tesla-optimus",
    title: "Tesla Optimus",
    improvedTitle: "Tesla entwickelt humanoiden Roboter Optimus",
    summary:
      "Tesla entwickelt einen humanoiden Roboter für Industrie und Alltag.",
    primaryCategory: "Technology",
    secondaryCategory: "Robotics",
    topic: "Humanoid Robots",
    subtopics: [
      "Tesla Optimus",
      "Industrial Automation",
    ],
    keywords: [
      "Tesla",
      "Optimus",
      "Robotics",
      "Humanoid Robot",
    ],
    language: "en",
    confidence: 0.95,
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
  },
  {
    id: "discovery-2",
    url: "https://example.com/boston-dynamics",
    title: "Boston Dynamics Atlas",
    improvedTitle:
      "Boston Dynamics präsentiert neue Atlas-Generation",
    summary:
      "Atlas ist ein elektrisch betriebener humanoider Roboter.",
    primaryCategory: "Technology",
    secondaryCategory: "Robotics",
    topic: "Humanoid Robots",
    subtopics: [
      "Boston Dynamics",
      "Industrial Automation",
    ],
    keywords: [
      "Boston Dynamics",
      "Atlas",
      "Robotics",
      "Humanoid Robot",
    ],
    language: "en",
    confidence: 0.93,
    createdAt: "2026-08-02T08:00:00.000Z",
    updatedAt: "2026-08-02T08:00:00.000Z",
  },
  {
    id: "discovery-3",
    url: "https://example.com/nvidia-ai",
    title: "NVIDIA AI Chips",
    improvedTitle:
      "NVIDIA entwickelt neue KI-Chips für Rechenzentren",
    summary:
      "Neue Prozessoren sollen das Training großer KI-Modelle beschleunigen.",
    primaryCategory: "Technology",
    secondaryCategory: "Artificial Intelligence",
    topic: "AI Hardware",
    subtopics: [
      "Semiconductors",
      "Data Centers",
    ],
    keywords: [
  "NVIDIA",
  "AI",
  "GPU",
  "Semiconductors",
  "Robotics",
    ],
    language: "en",
    confidence: 0.91,
    createdAt: "2026-08-03T08:00:00.000Z",
    updatedAt: "2026-08-03T08:00:00.000Z",
  },
];

const library = buildKnowledgeLibrary(discoveries);

console.log(
  JSON.stringify(library, null, 2),
);