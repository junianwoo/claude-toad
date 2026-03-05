export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  generator: string;
  created: string;
  framework: string | null;
  language: string;
  files: string[];
  mcp: boolean;
}
