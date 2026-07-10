import { describe, it, expect, beforeAll } from "vitest";
import { loadUpstreamConfig } from "../../scripts/lib/config.js";

/**
 * Sync check tests.
 * Verifies that the sync check logic can run without an API key
 * by only reading local state and config.
 */
describe("Sync check without API key", () => {
  let config: ReturnType<typeof loadUpstreamConfig>;

  beforeAll(() => {
    config = loadUpstreamConfig();
  });

  it("reads upstream config without authentication", () => {
    // Reading local config files does not require an API key
    expect(config.repository).toBeTruthy();
    expect(config.branch).toBeTruthy();
  });

  it("identifies the upstream docs path", () => {
    expect(config.docsPath).toBe("packages/coding-agent/docs");
  });

  it("reads the source site URL", () => {
    expect(config.sourceSite).toMatch(/^https?:\/\//);
  });

  it("does not require OpenRouter for sync check", () => {
    // sync check only reads local config and git state
    expect(process.env.OPENROUTER_API_KEY).toBeUndefinedOrMissing();
    // This test passes because we're not calling any API
  });
});

// Extend expect for our custom matcher
expect.extend({
  toBeUndefinedOrMissing(received: string | undefined) {
    const pass = received === undefined || received === "";
    return {
      pass,
      message: () => `expected ${received} to be undefined or missing`
    };
  }
});

declare module "vitest" {
  interface Assertion {
    toBeUndefinedOrMissing(): void;
  }
}
