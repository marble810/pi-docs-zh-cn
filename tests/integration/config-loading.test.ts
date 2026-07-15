import { describe, it, expect, beforeAll } from "vitest";
import {
  loadUpstreamConfig,
  loadGlossary,
  loadTranslationPolicy,
  loadNavigationOverrides,
  loadTranslationPrompt,
  getConfigVersions,
  hashString
} from "../../scripts/lib/config.js";

describe("Upstream config loading", () => {
  let config: ReturnType<typeof loadUpstreamConfig>;

  beforeAll(() => {
    config = loadUpstreamConfig();
  });

  it("loads upstream configuration from config/upstream.yml", () => {
    expect(config).toBeDefined();
    expect(typeof config.repository).toBe("string");
    expect(typeof config.branch).toBe("string");
    expect(typeof config.docsPath).toBe("string");
    expect(typeof config.sourceSite).toBe("string");
    expect(typeof config.targetLocale).toBe("string");
  });

  it("references the known upstream repository", () => {
    expect(config.repository).toBe("earendil-works/pi");
    expect(config.branch).toBe("main");
  });

  it("sets target locale to zh-CN", () => {
    expect(config.targetLocale).toBe("zh-CN");
  });

  it("validates schema with zod", () => {
    // Schema validation is built into loadUpstreamConfig
    expect(() => loadUpstreamConfig()).not.toThrow();
  });
});

describe("Glossary loading", () => {
  let glossary: ReturnType<typeof loadGlossary>;

  beforeAll(() => {
    glossary = loadGlossary();
  });

  it("loads glossary from config/glossary.yml", () => {
    expect(glossary).toBeDefined();
    expect(typeof glossary.version).toBe("number");
    expect(typeof glossary.terms).toBe("object");
    expect(typeof glossary.preserve).toBe("object");
  });

  it("has version field", () => {
    expect(glossary.version).toBeGreaterThanOrEqual(1);
  });
});

describe("Translation policy loading", () => {
  let policy: ReturnType<typeof loadTranslationPolicy>;

  beforeAll(() => {
    policy = loadTranslationPolicy();
  });

  it("loads translation policy from config/translation-policy.yml", () => {
    expect(policy).toBeDefined();
    expect(policy.version).toBeGreaterThanOrEqual(1);
  });

  it("defines price validation rules", () => {
    expect(policy.priceValidation).toBeDefined();
    expect(policy.priceValidation.prompt).toBe(0);
    expect(policy.priceValidation.completion).toBe(0);
  });

  it("defines model filters", () => {
    expect(policy.modelFilters.inputModalities).toContain("text");
    expect(policy.modelFilters.outputModalities).toContain("text");
    expect(policy.modelFilters.excludeExpiringWithinDays).toBeGreaterThan(0);
  });

  it("defines fallback router", () => {
    expect(policy.fallback.finalRouter).toBe("openrouter/free");
  });

  it("defines batch limits", () => {
    expect(policy.maxSegmentsPerBatch).toBeGreaterThan(0);
    expect(policy.maxInputCharactersPerBatch).toBeGreaterThan(0);
    expect(policy.maxRequestsPerRun).toBeGreaterThan(0);
  });
});

describe("Navigation overrides loading", () => {
  let nav: ReturnType<typeof loadNavigationOverrides>;

  beforeAll(() => {
    nav = loadNavigationOverrides();
  });

  it("loads navigation overrides from config/navigation-overrides.yml", () => {
    expect(nav).toBeDefined();
    expect(nav.groups).toBeDefined();
  });

  it("defines the expected groups", () => {
    const groupIds = Object.keys(nav.groups);
    expect(groupIds).toContain("getting-started");
    expect(groupIds).toContain("customization");
    expect(groupIds).toContain("reference");
    expect(groupIds).toContain("programmatic-usage");
    expect(groupIds).toContain("platform-setup");
    expect(groupIds).toContain("development");
  });

  it("provides bilingual titles for groups", () => {
    expect(nav.groups["getting-started"].title).toBe("开始使用｜Start here");
    expect(nav.groups["reference"].title).toBe("参考｜Reference");
  });
});

describe("Translation prompt loading", () => {
  it("loads translation prompt markdown", () => {
    const prompt = loadTranslationPrompt();
    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("中文标题｜EnglishTitle");
  });
});

describe("getConfigVersions", () => {
  it("returns version hashes for all configs", () => {
    const versions = getConfigVersions();
    expect(versions).toHaveProperty("promptVersion");
    expect(versions).toHaveProperty("glossaryVersion");
    expect(versions).toHaveProperty("translationPolicyVersion");
    expect(versions.promptVersion).toMatch(/^[0-9a-f]{8}$/);
    expect(versions.glossaryVersion).toMatch(/^\d+$/);
    expect(versions.translationPolicyVersion).toMatch(/^\d+$/);
  });
});

describe("hashString", () => {
  it("produces deterministic output", () => {
    const a = hashString("hello");
    const b = hashString("hello");
    expect(a).toBe(b);
  });

  it("produces 8-character hex strings", () => {
    expect(hashString("anything")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("differs for different inputs", () => {
    const a = hashString("abc");
    const b = hashString("xyz");
    expect(a).not.toBe(b);
  });

  it("handles empty string", () => {
    expect(hashString("")).toMatch(/^[0-9a-f]{8}$/);
  });
});
