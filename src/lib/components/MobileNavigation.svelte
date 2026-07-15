<script lang="ts">
  import { base } from "$app/paths";
  import type { NavigationGroup } from "../../../scripts/lib/types.js";
  import BilingualTitle from "./BilingualTitle.svelte";

  let { navigation, onNavigate }: { navigation: NavigationGroup[]; onNavigate?: () => void } =
    $props();
</script>

<div class="mobile-nav" role="navigation" aria-label="移动端导航">
  {#each navigation as group}
    <div class="mobile-nav-group">
      <h4 class="mobile-nav-heading">
        <BilingualTitle text={group.title} size="group" />
      </h4>
      <ul class="mobile-nav-list">
        {#each group.items as item}
          <li>
            <a
              href={base + "/docs/latest/" + item.slug}
              class="mobile-nav-link"
              onclick={onNavigate}
            >
              <BilingualTitle text={item.title} size="nav" />
            </a>
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</div>

<style>
  .mobile-nav {
    padding: var(--space-2) 0;
  }

  .mobile-nav-group {
    margin-bottom: var(--space-6);
  }

  .mobile-nav-heading {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--color-muted);
    margin: 0 0 var(--space-3);
    padding: 0 var(--space-3);
  }

  .mobile-nav-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .mobile-nav-link {
    display: block;
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-serif);
    font-size: var(--text-nav-lg);
    color: var(--color-fg);
    text-decoration: none;
  }

  .mobile-nav-link:hover {
    background: var(--color-surface-hover);
    text-decoration: none;
  }
</style>
