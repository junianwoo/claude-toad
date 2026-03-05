import { describe, it, expect } from "vitest";
import { parseSingleFile, parseMultipleFiles } from "../../src/generator/parser.js";

describe("parseSingleFile", () => {
  it("trims whitespace", () => {
    expect(parseSingleFile("  hello world  \n")).toBe("hello world");
  });

  it("handles multi-line content", () => {
    const input = `# My Project\n\nSome content\n- bullet`;
    expect(parseSingleFile(input)).toBe(input.trim());
  });
});

describe("parseMultipleFiles", () => {
  it("parses single file tag", () => {
    const input = `<file path="skills/nextjs.md">
---
name: nextjs-patterns
---
Some content
</file>`;
    const files = parseMultipleFiles(input);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("skills/nextjs.md");
    expect(files[0].content).toContain("nextjs-patterns");
  });

  it("parses multiple file tags", () => {
    const input = `<file path="skills/a.md">Content A</file>
<file path="skills/b.md">Content B</file>
<file path="agents/c.md">Content C</file>`;
    const files = parseMultipleFiles(input);
    expect(files).toHaveLength(3);
    expect(files[0].path).toBe("skills/a.md");
    expect(files[1].path).toBe("skills/b.md");
    expect(files[2].path).toBe("agents/c.md");
  });

  it("handles empty response", () => {
    expect(parseMultipleFiles("")).toHaveLength(0);
  });

  it("ignores text outside file tags", () => {
    const input = `Here is some text
<file path="test.md">Content</file>
And some more text`;
    const files = parseMultipleFiles(input);
    expect(files).toHaveLength(1);
    expect(files[0].content).toBe("Content");
  });
});
