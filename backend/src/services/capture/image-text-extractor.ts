import OpenAI from "openai";

const MAX_DESCRIPTION_LENGTH =
  14_000;

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

export async function extractImageKnowledge(
  input: {
    bytes: Buffer;
    mimeType: string;
    fileName: string;
    preferredLanguage:
      | "de"
      | "en"
      | "fr"
      | "it"
      | "es";
  },
): Promise<string> {
  if (
    !process.env
      .OPENAI_API_KEY
  ) {
    throw new Error(
      "OPENAI_API_KEY is not configured.",
    );
  }

  const dataUrl =
    [
      `data:${input.mimeType};base64,`,
      input.bytes.toString(
        "base64",
      ),
    ].join("");

  const response =
    await openai.responses.create({
      model:
        "gpt-4.1-mini",

      instructions: [
        "You analyze images for a personal knowledge system.",
        "Describe only information that is visibly supported by the image.",
        "Extract all readable text, including headings, labels, numbers and annotations.",
        "Explain charts, diagrams, tables, technical drawings and relationships between visible elements.",
        "Separate direct observations from reasonable interpretations.",
        "Do not identify unknown people.",
        `Write in language code ${input.preferredLanguage}.`,
        "Return continuous, well-structured plain text without JSON.",
      ].join(" "),

      input: [
        {
          role:
            "user",

          content: [
            {
              type:
                "input_text",

              text:
                `Analyze the uploaded image named "${input.fileName}" for SaveWise.`,
            },

            {
              type:
                "input_image",

              image_url:
                dataUrl,

              detail:
                "high",
            },
          ],
        },
      ],
    });

  const description =
    response.output_text
      ?.trim()
      .slice(
        0,
        MAX_DESCRIPTION_LENGTH,
      );

  if (!description) {
    throw new Error(
      "IMAGE_ANALYSIS_EMPTY",
    );
  }

  return description;
}
