<script lang="ts">
  import { base } from "$app/paths";
  import type { NavigationGroup } from "../../../scripts/lib/types.js";
  import Accordion from "./ui/Accordion.svelte";

  let { navigation, onNavigate }: { navigation: NavigationGroup[]; onNavigate?: () => void } =
    $props();
</script>

<div class="mobile-nav" role="navigation" aria-label="移动端导航">
  <Accordion type="multiple">
    {#each navigation as group}
      <div class="mobile-nav-group">
        <details class="mobile-nav-details" name="mobile-nav">
          <summary class="mobile-nav-summary">{group.title}</summary>
          <ul class="mobile-nav-list">
            {#each group.items as item}
              <li>
                <a
                  href={base + "/docs/latest/" + item.slug}
                  class="mobile-nav-link"
                  onclick={onNavigate}
                >
                  {item.title}
                </a>
              </li>
            {/each}
          </ul>
        </details>
      </div>
    {/each}
  </Accordion>
</div>

<style>
  .mobile-nav {
    padding: var(--space-2) 0;
  }

  .mobile-nav-group {
    margin-bottom: var(--space-1);
  }

  .mobile-nav-summary {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 600;
    padding: 8px 12px;
    cursor: pointer;
    color: var(--color-muted);
    list-style: none;
  }

  .mobile-nav-summary::marker {
    display: none;
  }

  .mobile-nav-list {
    list-style: none;
    padding: 0;
    margin: 0 0 0 12px;
  }

  .mobile-nav-link {
    display: block;
    padding: 8px 12px;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-fg);
    text-decoration: none;
    border-radius: var(--radius-sm);
  }

  .mobile-nav-link:hover {
    background: var(--color-surface-hover);
    text-decoration: none;
  }
</style>
