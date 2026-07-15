<script lang="ts">
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import type { NavigationGroup } from "../../../scripts/lib/types.js";
  import BilingualTitle from "./BilingualTitle.svelte";

  let { navigation }: { navigation: NavigationGroup[] } = $props();
  let currentSlug = $derived(
    $page.url.pathname
      .replace(base, "")
      .replace(/\/$/, "")
      .replace(/^\/docs\/latest\//, "")
  );
</script>

<nav class="sidebar" aria-label="文档导航">
  <div class="sidebar-inner">
    {#each navigation as group}
      <div class="nav-group">
        <h3 class="nav-group-title">
          <BilingualTitle text={group.title} size="group" />
        </h3>
        <ul class="nav-list">
          {#each group.items as item}
            <li>
              <a
                href={base + "/docs/latest/" + item.slug}
                class="nav-link"
                class:active={currentSlug === item.slug}
              >
                <BilingualTitle text={item.title} size="nav" />
              </a>
              {#if item.children?.length}
                <ul class="nav-sublist">
                  {#each item.children as child}
                    <li>
                      <a
                        href={base + "/docs/latest/" + child.slug}
                        class="nav-link nav-sublink"
                        class:active={currentSlug === child.slug}
                      >
                        <BilingualTitle text={child.title} size="nav" />
                      </a>
                    </li>
                  {/each}
                </ul>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</nav>

<style>
  .sidebar {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }

  .sidebar-inner {
    padding: var(--space-5) var(--space-4) var(--space-6);
  }

  .nav-group {
    margin-bottom: var(--space-8);
  }

  .nav-group-title {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--color-muted);
    margin: 0 0 var(--space-3);
    padding: 0;
  }

  .nav-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .nav-link {
    display: block;
    padding: var(--space-0-5) 0;
    font-family: var(--font-serif);
    font-size: var(--text-nav-lg);
    color: var(--color-muted);
    text-decoration: none;
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
  }

  .nav-link:hover {
    color: var(--color-fg);
    text-decoration: none;
  }

  .nav-link.active {
    background: transparent;
    color: var(--color-accent);
    font-weight: 400;
  }

  :global(.sidebar .bilingual-title__zh) {
    color: var(--color-fg);
  }

  .nav-sublist {
    list-style: none;
    padding: 0;
    margin: var(--space-0-5) 0 0 var(--space-3);
  }

  .nav-sublink {
    font-size: var(--text-nav);
    padding: var(--space-0-5) 0;
  }
</style>
