import { GeneratedFile } from "./index.js";

export function parseSingleFile(response: string): string {
  return response.trim();
}

export function parseMultipleFiles(response: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const regex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;

  let match;
  while ((match = regex.exec(response)) !== null) {
    files.push({
      path: match[1].trim(),
      content: match[2].trim(),
    });
  }

  return files;
}
