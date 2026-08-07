"use client";

import { useEffect, useState } from "react";
import type { KnowledgeItem } from "@savewise/shared";
import { MockAIService } from "@savewise/shared";

interface AIInsightsProps {
  item: KnowledgeItem;
}

const ai = new MockAIService();

export default function AIInsights({
  item,
}: AIInsightsProps) {
  const [summary, setSummary] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [category, setCategory] = useState("");

  useEffect(() => {
    async function load() {
      setSummary(await ai.summarize(item));
      setKeywords(await ai.keywords(item));
      setCategory(await ai.category(item));
    }

    load();
  }, [item]);

  return (
    <div className="mt-6 rounded-xl bg-gray-50 p-4">
      <h4 className="font-semibold">🧠 AI Insights</h4>

      <p className="mt-2 text-sm">{summary}</p>

      <div className="mt-3 text-sm">
        <strong>Keywords:</strong>{" "}
        {keywords.join(", ")}
      </div>

      <div className="mt-2 text-sm">
        <strong>Category:</strong>{" "}
        {category}
      </div>
    </div>
  );
}