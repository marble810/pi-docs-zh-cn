import { describe, it, expect } from "vitest";
import type { NavigationGroup, NavigationItem } from "../../scripts/lib/types.js";

/**
 * Navigation generation tests.
 * Navigation is structured as groups with nested items.
 */
describe("Navigation generation", () => {
  function buildNavigation(
    groups: Record<string, { title: string; items: NavigationItem[] }>
  ): NavigationGroup[] {
    return Object.entries(groups).map(([id, g]) => ({
      id,
      title: g.title,
      items: g.items
    }));
  }

  it("builds navigation from group definitions", () => {
    const groups: Record<string, { title: string; items: NavigationItem[] }> = {
      "getting-started": {
        title: "Getting Started",
        items: [
          { slug: "docs/latest/installation", title: "Installation" },
          { slug: "docs/latest/quickstart", title: "Quickstart" }
        ]
      }
    };
    const nav = buildNavigation(groups);
    expect(nav).toHaveLength(1);
    expect(nav[0].id).toBe("getting-started");
    expect(nav[0].items).toHaveLength(2);
  });

  it("supports nested navigation items", () => {
    const groups: Record<string, { title: string; items: NavigationItem[] }> = {
      reference: {
        title: "Reference",
        items: [
          {
            slug: "docs/latest/api",
            title: "API",
            children: [
              { slug: "docs/latest/api/config", title: "Config" },
              { slug: "docs/latest/api/cli", title: "CLI" }
            ]
          }
        ]
      }
    };
    const nav = buildNavigation(groups);
    expect(nav[0].items[0].children).toHaveLength(2);
    expect(nav[0].items[0].children![0].title).toBe("Config");
  });

  it("handles empty groups", () => {
    const groups: Record<string, { title: string; items: NavigationItem[] }> = {};
    const nav = buildNavigation(groups);
    expect(nav).toHaveLength(0);
  });

  it("preserves group order as defined", () => {
    const groups: Record<string, { title: string; items: NavigationItem[] }> = {
      z: { title: "Z", items: [] },
      a: { title: "A", items: [] },
      m: { title: "M", items: [] }
    };
    const nav = buildNavigation(groups);
    // Object.entries preserves insertion order
    expect(nav.map((g) => g.id)).toEqual(["z", "a", "m"]);
  });
});
