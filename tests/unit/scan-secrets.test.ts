import { describe, it, expect } from "vitest";
import { scanSecrets } from "../../scripts/scan-secrets.js";

describe("scanSecrets", () => {
  it("returns a ScanResult structure", () => {
    const result = scanSecrets(__dirname);
    expect(result).toHaveProperty("findings");
    expect(result).toHaveProperty("exitCode");
    expect(Array.isArray(result.findings)).toBe(true);
  });
});
