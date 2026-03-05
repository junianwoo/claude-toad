# Contributing to Claude Toad

## Development Setup

```bash
git clone https://github.com/your-org/claude-toad.git
cd claude-toad
npm install
npm run build
npm test
```

## Running Locally

```bash
npm run build
node dist/index.js init --dry-run
```

## Adding a Framework Detector

Framework detectors live in `src/scanner/`. Each detector is a single file that reads project files and returns detection results.

### Step 1: Add detection logic

If your framework uses `package.json`, add detection to `src/scanner/detect-framework.ts`:

```typescript
if (deps["your-framework"]) {
  result.name = "your-framework";
  result.version = deps["your-framework"].replace(/[\^~]/g, "");
  return result;
}
```

For other ecosystems, check the appropriate config file (pyproject.toml, go.mod, Gemfile, Cargo.toml).

### Step 2: Add a test fixture

Create `tests/fixtures/your-framework-app/` with minimal project files:
- The config file your framework uses (package.json, pyproject.toml, etc.)
- At least one source file in the expected directory structure

### Step 3: Add tests

Add test cases in `tests/scanner/scanner.test.ts`:

```typescript
it("detects your-framework", async () => {
  const result = await detectFramework(path.join(fixtures, "your-framework-app"));
  expect(result.name).toBe("your-framework");
});
```

### Step 4: Submit a PR

One file, one fixture, one test. That's it.

## Project Structure

```
src/
  index.ts              CLI entry point
  commands/             Command implementations
  scanner/              Project detection (no AI)
  generator/            API calls and prompt engineering
  writer/               File output
  packager/             Plugin packaging
  scaffolder/           New project scaffolding
  smidge/               Smidge API client
  utils/                Config, logging, API key management
tests/
  scanner/              Scanner tests
  generator/            Generator tests
  packager/             Packager tests
  fixtures/             Test project directories
```

## Code Style

- TypeScript strict mode
- ESM modules
- Pure functions where possible
- No AI in the scanner (pure filesystem reads)
- Tests for every detector

## What We're Looking For

- Framework detectors (highest priority)
- Prompt improvements (test against real repos first)
- Bug fixes
- Documentation

## What We're Not Looking For

- Features that add complexity without clear value
- Dependencies we don't need
- Changes to the core architecture without discussion
