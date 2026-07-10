import { describe, it, expect } from "vitest";
import type { FileChange } from "../../scripts/lib/types.js";

/**
 * File diff/rename utilities.
 * Tests for the FileChange type and its discriminated union variants.
 */
describe("File diff / rename", () => {
  it("discriminates added files", () => {
    const change: FileChange = { type: "added", path: "docs/new.md" };
    expect(change.type).toBe("added");
    if (change.type === "added") {
      expect(change.path).toMatch(/\.md$/);
    }
  });

  it("discriminates modified files", () => {
    const change: FileChange = { type: "modified", path: "docs/guide.md" };
    expect(change.type).toBe("modified");
  });

  it("discriminates deleted files", () => {
    const change: FileChange = { type: "deleted", path: "docs/old.md" };
    expect(change.type).toBe("deleted");
  });

  it("discriminates renamed files with from/to", () => {
    const change: FileChange = {
      type: "renamed",
      from: "docs/old-name.md",
      to: "docs/new-name.md"
    };
    expect(change.type).toBe("renamed");
    expect(change.from).toBe("docs/old-name.md");
    expect(change.to).toBe("docs/new-name.md");
  });

  it("discriminates unchanged files", () => {
    const change: FileChange = { type: "unchanged", path: "docs/unchanged.md" };
    expect(change.type).toBe("unchanged");
  });

  it("infers rename from paths", () => {
    const oldPath: string = "docs/draft.md";
    const newPath: string = "docs/published.md";
    const isRename = oldPath !== newPath;
    const change: FileChange =
      isRename && oldPath
        ? { type: "renamed", from: oldPath, to: newPath }
        : { type: "added", path: newPath };

    expect(change.type).toBe("renamed");
    if (change.type === "renamed") {
      expect(change.from).toBe("docs/draft.md");
      expect(change.to).toBe("docs/published.md");
    }
  });
});
