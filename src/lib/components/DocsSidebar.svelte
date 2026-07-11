<script lang="ts">
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  import type { NavigationGroup } from "../../../scripts/lib/types.js";

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
        <h3 class="nav-group-title">{group.title}</h3>
        <ul class="nav-list">
          {#each group.items as item}
            <li>
              <a
                href={base + "/docs/latest/" + item.slug}
                class="nav-link"
                class:active={currentSlug === item.slug}
              >
                {item.title}
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
                        {child.title}
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
    width: var(--sidebar-width);
    flex-shrink: 0;
    overflow-y: auto;
    height: calc(100vh - var(--header-height));
    position: sticky;
    top: var(--header-height);
  }

  .sidebar-inner {
    padding: var(--space-10) 0 var(--space-8);
  }

  .nav-group {
    margin-bottom: var(--space-8);
  }

  .nav-group-title {
    font-family: var(--font-sans);
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 0.08em;
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
    padding: 3px 0;
    font-family: var(--font-serif);
    font-size: 0.9rem;
    color: var(--color-muted);
    text-decoration: none;
    border-radius: 0;
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

  .nav-sublist {
    list-style: none;
    padding: 0;
    margin: 2px 0 0 var(--space-3);
  }

  .nav-sublink {
    font-size: 0.8rem;
    padding: 2px 0;
  }
</style>
