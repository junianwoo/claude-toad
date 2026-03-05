import fs from "fs-extra";
import path from "path";

const SMIDGE_API_URL = "https://smdg.app/api/v1";

export async function generateSkill(
  source: string,
  smidgeKey: string
): Promise<{ filename: string; content: string }> {
  const formData = new FormData();

  if (source.startsWith("http://") || source.startsWith("https://")) {
    formData.append("source", source);
  } else {
    // File path — read and upload
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
    skill: { filename: string; content: string };
  };
  return {
    filename: data.skill.filename,
    content: data.skill.content,
  };
}
