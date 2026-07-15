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
    width: 100%;
    padding: var(--space-5) var(--space-4) var(--space-6);
  }

  .toc-title {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: var(--tracking-wide);
    color: var(--color-muted);
    margin: 0 0 var(--space-3);
  }

  .toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .toc-item {
    margin-bottom: var(--space-0-5);
  }

  .toc-link {
    display: block;
    padding: var(--space-0-5) 0;
    font-family: var(--font-serif);
    font-size: var(--text-nav);
    color: var(--color-muted);
    text-decoration: none;
    border-left: 1px solid transparent;
    padding-left: var(--space-3);
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
