<script lang="ts">
  import { base } from "$app/paths";
  import ThemeMenu from "./ui/ThemeMenu.svelte";
  import SearchDialog from "./SearchDialog.svelte";
  import type { Snippet } from "svelte";

  let {
    mobileNav
  }: {
    mobileNav?: Snippet;
  } = $props();

  let searchOpen = $state(false);
</script>

<header class="site-header">
  <div class="header-inner">
    <button class="mobile-menu-btn" id="mobile-menu-trigger" aria-label="打开导航菜单">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>

    <a href={base + "/"} class="logo-link">
      <span class="logo-text">Pi Docs</span>
      <span class="logo-badge">中文</span>
    </a>

    <nav class="header-nav">
      <a href={base + "/docs/latest/"}>文档</a>
    </nav>

    <div class="header-actions">
      <button class="search-btn" onclick={() => (searchOpen = true)} aria-label="搜索文档">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span class="search-hint">搜索</span>
        <kbd class="search-kbd">⌘K</kbd>
      </button>
      <ThemeMenu />
    </div>
  </div>
</header>

<SearchDialog bind:open={searchOpen} />

<div class="mobile-nav-container" id="mobile-nav" hidden>
  <div class="mobile-nav-inner">
    {#if mobileNav}
      {@render mobileNav()}
    {/if}
  </div>
</div>

<!-- Mobile overlay + drawer managed via dialog pattern -->
{#if false}
  <!-- ponytail: mobile-nav dialog placeholder — add Dialog-based mobile nav when needed -->
{/if}

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--color-header-bg);
    height: var(--header-height);
  }

  .header-inner {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 var(--space-8);
    height: 100%;
  }

  .mobile-menu-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-fg);
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .mobile-menu-btn {
      display: flex;
    }
  }

  .logo-link {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    text-decoration: none;
  }

  .logo-text {
    font-family: var(--font-mono);
    font-weight: 400;
    font-size: 0.82rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-fg);
  }

  .logo-badge {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    padding: 1px 5px;
    border-radius: 2px;
    border: 1px solid var(--color-border);
    color: var(--color-muted);
    font-weight: 400;
  }

  .header-nav {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-left: var(--space-4);
  }

  .header-nav a {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    color: var(--color-muted);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  .header-nav a:hover {
    color: var(--color-fg);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-left: auto;
  }

  .search-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-surface);
    color: var(--color-muted);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .search-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-fg);
  }

  .search-hint {
    display: none;
  }

  @media (min-width: 640px) {
    .search-hint {
      display: inline;
    }
  }

  .search-kbd {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    padding: 1px 4px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: var(--color-bg);
  }

  .mobile-nav-container {
    display: none;
  }
</style>
