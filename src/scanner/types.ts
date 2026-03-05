export interface ProjectFingerprint {
  framework: {
    name: string | null;
    version: string | null;
    variant: string | null;
  };
  language: {
    primary: string;
    version: string | null;
    strict: boolean;
  };
  database: {
    orm: string | null;
    provider: string | null;
    migrations: string | null;
  };
  testing: {
    unit: string | null;
    e2e: string | null;
    testDir: string | null;
    testCommand: string | null;
  };
  services: {
    hosting: string | null;
    ci: string | null;
    payments: string | null;
    auth: string | null;
    baas: string | null;
    all: string[];
  };
  linting: {
    linter: string | null;
    formatter: string | null;
    lintCommand: string | null;
  };
  readme: {
    exists: boolean;
    summary: string | null;
  };
  structure: {
    tree: string[];
    keyDirs: string[];
    fileCount: Record<string, number>;
  };
  packageManager: string | null;
  projectName: string | null;
}
