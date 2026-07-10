<script lang="ts">
  import DropdownMenu from "./DropdownMenu.svelte";

  let theme = $state<"system" | "light" | "dark">("system");
  let dropdownOpen = $state(false);

  function applyTheme(t: "system" | "light" | "dark") {
    theme = t;
    if (t === "system") {
      localStorage.removeItem("pi-docs-theme");
      document.documentElement.setAttribute("data-theme", "system");
    } else {
      localStorage.setItem("pi-docs-theme", t);
      document.documentElement.setAttribute("data-theme", t);
    }
  }

  $effect(() => {
    const stored = localStorage.getItem("pi-docs-theme");
    if (stored === "dark" || stored === "light") {
      theme = stored;
    }
  });
</script>

<DropdownMenu bind:open={dropdownOpen}>
  {#snippet trigger()}
    <button class="theme-trigger" aria-label="切换主题">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  {/snippet}
  {#snippet content()}
    <div class="theme-menu-items">
      <button
        class="theme-item"
        class:active={theme === "system"}
        onclick={() => applyTheme("system")}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        系统
      </button>
      <button
        class="theme-item"
        class:active={theme === "light"}
        onclick={() => applyTheme("light")}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        浅色
      </button>
      <button class="theme-item" class:active={theme === "dark"} onclick={() => applyTheme("dark")}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        深色
      </button>
    </div>
  {/snippet}
</DropdownMenu>

<style>
  .theme-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-fg);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .theme-trigger:hover {
    background: var(--color-surface-hover);
  }

  .theme-menu-items {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    min-width: 120px;
  }

  .theme-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: none;
    background: transparent;
    color: var(--color-fg);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
  }

  .theme-item:hover {
    background: var(--color-surface-hover);
  }

  .theme-item.active {
    background: var(--color-accent-soft);
    color: var(--color-accent);
  }
</style>
