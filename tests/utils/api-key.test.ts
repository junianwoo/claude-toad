import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveModel } from "../../src/utils/api-key.js";

describe("resolveModel", () => {
  it("maps opus to claude-opus-4-6", () => {
    expect(resolveModel("opus")).toBe("claude-opus-4-6");
  });

  it("maps sonnet to claude-sonnet-4-6", () => {
    expect(resolveModel("sonnet")).toBe("claude-sonnet-4-6");
  });

  it("maps Opus (case insensitive) to claude-opus-4-6", () => {
    expect(resolveModel("Opus")).toBe("claude-opus-4-6");
  });

  it("passes through full model IDs unchanged", () => {
    expect(resolveModel("claude-opus-4-6")).toBe("claude-opus-4-6");
  });
});
