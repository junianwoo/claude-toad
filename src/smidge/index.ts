import fs from "fs-extra";
import path from "path";

const SMIDGE_API_URL = "https://smdg.app/api/v1";

export interface DetectedTopic {
  topicName: string;
  slug: string;
  description: string;
  estimatedWordCount: number;
}

export interface GeneratedSkill {
  topic: DetectedTopic;
  filename: string;
  content: string;
  referenceFiles: Array<{ filename: string; content: string }>;
  wordCount: number;
}

export async function detectTopics(
  source: string,
  smidgeKey: string
): Promise<{ shouldCatalogue: boolean; wordCount: number; topics: DetectedTopic[]; isUnlimited: boolean }> {
  const formData = new FormData();

  if (source.startsWith("http://") || source.startsWith("https://")) {
    formData.append("source", source);
  } else {
    const filePath = path.resolve(source);
    if (!(await fs.pathExists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }
    const fileBuffer = await fs.readFile(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append("source", blob, path.basename(filePath));
  }

  const response = await fetch(`${SMIDGE_API_URL}/detect-topics`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${smidgeKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = "Topic detection failed";
    try {
      const error = await response.json();
      errorMessage = (error as { error?: { message?: string } }).error?.message || errorMessage;
    } catch {}
    if (response.status === 401) throw new Error("Invalid or missing API key");
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as {
    shouldCatalogue: boolean;
    wordCount: number;
    topics: DetectedTopic[];
    isUnlimited?: boolean;
  };

  return { ...data, isUnlimited: data.isUnlimited ?? false };
}

export async function generateSkill(
  source: string,
  smidgeKey: string
): Promise<{
  filename: string;
  content: string;
  referenceFiles: Array<{ filename: string; content: string }>;
  wordCount: number;
  creditsRemaining: number;
}> {
  const formData = new FormData();

  if (source.startsWith("http://") || source.startsWith("https://")) {
    formData.append("source", source);
  } else {
    const filePath = path.resolve(source);
    if (!(await fs.pathExists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }
    const fileBuffer = await fs.readFile(filePath);
    const blob = new Blob([fileBuffer]);
    formData.append("source", blob, path.basename(filePath));
  }

  const response = await fetch(`${SMIDGE_API_URL}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${smidgeKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = "Generation failed";
    try {
      const error = await response.json();
      errorMessage = (error as { error?: { message?: string } }).error?.message || errorMessage;
    } catch {}

    if (response.status === 401) {
      throw new Error("Invalid or missing API key");
    }
    if (response.status === 402) {
      throw new Error("insufficient_credits");
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as {
    skill: {
      filename: string;
      content: string;
      reference_files: Array<{ filename: string; content: string }>;
      word_count: number;
    };
    metadata: { credits_remaining: number };
  };

  return {
    filename: data.skill.filename,
    content: data.skill.content,
    referenceFiles: data.skill.reference_files ?? [],
    wordCount: data.skill.word_count ?? 0,
    creditsRemaining: data.metadata.credits_remaining ?? 0,
  };
}

export async function generateCatalogue(
  source: string,
  selectedTopics: DetectedTopic[],
  smidgeKey: string,
  onProgress: (message: string) => void
): Promise<{
  skills: GeneratedSkill[];
  masterIndex: { filename: string; content: string };
  creditsRemaining: number;
}> {
  const response = await fetch(`${SMIDGE_API_URL}/generate/catalogue`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${smidgeKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source, selected_topics: selectedTopics }),
  });

  if (!response.ok) {
    let errorMessage = "Catalogue generation failed";
    try {
      const error = await response.json();
      errorMessage = (error as { error?: { message?: string } }).error?.message || errorMessage;
    } catch {}
    if (response.status === 401) throw new Error("Invalid or missing API key");
    if (response.status === 402) throw new Error("insufficient_credits");
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("No response body from catalogue endpoint");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        // event type captured on next iteration via data:
        continue;
      }
      if (line.startsWith("data: ")) {
        const rawData = line.slice(6);
        try {
          const parsed = JSON.parse(rawData) as {
            step?: string;
            message?: string;
            code?: string;
            catalogueId?: string;
            skills?: GeneratedSkill[];
            masterIndex?: { filename: string; content: string };
            creditsRemaining?: number;
          };

          if (parsed.message && !parsed.catalogueId) {
            onProgress(parsed.message);
          }

          if (parsed.catalogueId) {
            // complete event
            return {
              skills: parsed.skills ?? [],
              masterIndex: parsed.masterIndex ?? { filename: "index.md", content: "" },
              creditsRemaining: parsed.creditsRemaining ?? 0,
            };
          }

          if (parsed.code) {
            // error event
            if (parsed.code === "insufficient_credits") {
              throw new Error("insufficient_credits");
            }
            throw new Error(parsed.message ?? "Catalogue generation failed");
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }

  throw new Error("Catalogue stream ended without completion");
}
