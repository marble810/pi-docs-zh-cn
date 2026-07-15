<script lang="ts">
  import { base } from "$app/paths";
  import { mobileNavOpen } from "$lib/stores/ui.js";
  import SearchDialog from "./SearchDialog.svelte";
</script>

<header class="site-header">
  <div class="header-inner">
    <button
      class="mobile-menu-btn"
      id="mobile-menu-trigger"
      aria-label="打开导航菜单"
      onclick={() => ($mobileNavOpen = true)}
    >
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
      <img src="{base}/icon.svg" class="logo-icon" alt="Pi" width="30" height="30" />
    </a>

    <SearchDialog inline />
  </div>
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: var(--z-header);
    background: var(--color-bg);
    height: var(--header-height);
    box-sizing: border-box;
    padding: var(--space-4) var(--space-8) 0;
  }

  .header-inner {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
    max-width: var(--docs-cluster-width);
    margin: 0 auto;
    padding: 0 var(--space-5);
    height: 100%;
    border: 1px solid var(--color-border);
    background: linear-gradient(180deg, var(--color-surface-hover), var(--color-surface));
  }

  @media (max-width: 1100px) {
    .header-inner {
      max-width: calc(var(--sidebar-width) + var(--content-max-width) + var(--space-4));
    }
  }

  @media (max-width: 768px) {
    .site-header {
      padding: var(--space-3) var(--space-5) 0;
    }

    .header-inner {
      max-width: none;
    }
  }

  .mobile-menu-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: var(--size-control-lg);
    height: var(--size-control-lg);
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
    gap: var(--space-4);
    text-decoration: none;
  }

  .logo-icon {
    display: block;
  }
</style>
