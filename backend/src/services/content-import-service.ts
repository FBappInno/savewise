import { analyzeContent } from "./openai-content-analyzer";
import { fetchPageMetadata } from "./metadata-fetcher";

export async function importContent(
  url: string,
) {
  console.log("[Import] Starting:", url);

  console.time("[Import] Metadata");

  const metadata =
    await fetchPageMetadata(url);

  console.timeEnd("[Import] Metadata");

  console.log(
    "[Import] Metadata loaded:",
    metadata.title,
  );

  console.time("[Import] AI");

  const analysis =
    await analyzeContent(metadata);

  console.timeEnd("[Import] AI");

  console.log(
    "[Import] AI analysis completed",
  );

  return {
    metadata,

    analysis,

    organization: {
      primaryCategory:
        analysis.classification.primaryCategory,

      secondaryCategory:
        analysis.classification.secondaryCategory,

      topic:
        analysis.classification.topic,

      subtopics:
        analysis.classification.subtopics,
    },
  };
}