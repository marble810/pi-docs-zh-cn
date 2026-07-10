<script lang="ts">
  import type { Heading } from "$lib/markdown/types.js";

  let { headings }: { headings: Heading[] } = $props();
  let activeId = $state("");

  $effect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeId = entry.target.id;
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  });
</script>

{#if headings.length > 0}
  <nav class="toc" aria-label="页面目录">
    <h4 class="toc-title">目录</h4>
    <ul class="toc-list">
      {#each headings as heading}
        <li class="toc-item" style="padding-left: {heading.depth === 3 ? 'var(--space-4)' : '0'}">
          <a href="#{heading.id}" class="toc-link" class:active={activeId === heading.id}>
            {heading.text}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}

<style>
  .toc {
    width: var(--toc-width);
    flex-shrink: 0;
    position: sticky;
    top: calc(var(--header-height) + var(--space-6));
    max-height: calc(100vh - var(--header-height) - var(--space-8));
    overflow-y: auto;
    padding: var(--space-2) 0 0 var(--space-4);
  }

  .toc-title {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    margin: 0 0 var(--space-3);
  }

  .toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc-item {
    margin-bottom: 2px;
  }

  .toc-link {
    display: block;
    padding: 4px 0;
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    color: var(--color-muted);
    text-decoration: none;
    border-left: 2px solid transparent;
    padding-left: var(--space-2);
    transition: all var(--transition-fast);
  }

  .toc-link:hover {
    color: var(--color-fg);
    text-decoration: none;
  }

  .toc-link.active {
    color: var(--color-toc-active);
    border-left-color: var(--color-toc-active);
  }
</style>
