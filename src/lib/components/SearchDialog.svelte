<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import Dialog from "./ui/Dialog.svelte";
  import MiniSearch from "minisearch";
  import type { SearchDocument } from "../../../scripts/lib/types.js";

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let query = $state("");
  let results = $state<SearchDocument[]>([]);
  let miniSearch: MiniSearch<SearchDocument> | null = null;
  let selectedIndex = $state(0);
  let inputEl: HTMLInputElement | undefined = $state();

  onMount(async () => {
    try {
      const resp = await fetch(base + "/search-index.json");
      const docs: SearchDocument[] = await resp.json();
      miniSearch = new MiniSearch<SearchDocument>({
        fields: ["title", "headings", "body"],
        storeFields: ["slug", "title", "section"]
      });
      miniSearch.addAll(docs);
    } catch {
      // search index unavailable
    }
  });

  $effect(() => {
    if (open) requestAnimationFrame(() => inputEl?.focus());
  });

  $effect(() => {
    if (miniSearch && query.trim().length > 0) {
      results = miniSearch.search(query, {
        prefix: true,
        fuzzy: 0.2
      }) as unknown as SearchDocument[];
      selectedIndex = 0;
    } else {
      results = [];
    }
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      window.location.href = base + "/docs/latest/" + results[selectedIndex].slug;
    }
  }

  function closeAndClear() {
    open = false;
    query = "";
    results = [];
  }

  // Global keyboard shortcut
  $effect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open = !open;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<Dialog bind:open>
  {#snippet content()}
    <div class="search-dialog" role="dialog" aria-label="搜索文档">
      <div class="search-input-wrapper">
        <svg
          class="search-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          bind:this={inputEl}
          type="text"
          class="search-input"
          placeholder="搜索文档..."
          bind:value={query}
        />
        <button class="search-close" onclick={closeAndClear} aria-label="关闭搜索">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {#if results.length > 0}
        <ul class="search-results">
          {#each results as result, i}
            <li>
              <a
                href={base + "/docs/latest/" + result.slug}
                class="search-result-item"
                class:selected={i === selectedIndex}
                onclick={closeAndClear}
              >
                <span class="search-result-title">{result.title}</span>
                {#if result.section}
                  <span class="search-result-section">{result.section}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
      {#if query.trim().length > 0 && results.length === 0}
        <div class="search-empty">未找到结果</div>
      {/if}
      <div class="search-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> 导航</span>
        <span><kbd>↵</kbd> 打开</span>
        <span><kbd>Esc</kbd> 关闭</span>
      </div>
    </div>
  {/snippet}
</Dialog>

<style>
  .search-dialog {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: min(560px, 90vw);
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .search-icon {
    flex-shrink: 0;
    color: var(--color-muted);
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    font-family: var(--font-sans);
    font-size: var(--text-base);
    color: var(--color-fg);
  }

  .search-input::placeholder {
    color: var(--color-muted);
  }

  .search-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
  }

  .search-close:hover {
    background: var(--color-surface-hover);
  }

  .search-results {
    list-style: none;
    padding: var(--space-2);
    margin: 0;
    overflow-y: auto;
    flex: 1;
  }

  .search-result-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--color-fg);
    transition: background var(--transition-fast);
  }

  .search-result-item:hover,
  .search-result-item.selected {
    background: var(--color-surface-hover);
    text-decoration: none;
  }

  .search-result-title {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 500;
  }

  .search-result-section {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    color: var(--color-muted);
  }

  .search-empty {
    padding: var(--space-8);
    text-align: center;
    color: var(--color-muted);
    font-family: var(--font-sans);
    font-size: var(--text-sm);
  }

  .search-footer {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--color-border);
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    color: var(--color-muted);
  }

  .search-footer kbd {
    font-family: var(--font-mono);
    padding: 1px 4px;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-size: 10px;
    margin: 0 2px;
  }
</style>
