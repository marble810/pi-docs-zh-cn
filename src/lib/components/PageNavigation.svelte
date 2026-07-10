<script lang="ts">
  import { base } from "$app/paths";
  import type { DocsManifestPage } from "../../../scripts/lib/types.js";

  let { current, allPages }: { current?: DocsManifestPage; allPages: DocsManifestPage[] } =
    $props();

  let currentIndex = $derived(current ? allPages.findIndex((p) => p.slug === current.slug) : -1);
  let prev = $derived(currentIndex > 0 ? allPages[currentIndex - 1] : undefined);
  let next = $derived(
    currentIndex >= 0 && currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : undefined
  );
</script>

{#if prev || next}
  <nav class="page-nav" aria-label="页面导航">
    <div class="page-nav-prev">
      {#if prev}
        <a href={base + "/docs/latest/" + prev.slug + "/"} class="page-nav-link">
          <span class="page-nav-direction">上一页</span>
          <span class="page-nav-title">{prev.title}</span>
        </a>
      {/if}
    </div>
    <div class="page-nav-next">
      {#if next}
        <a href={base + "/docs/latest/" + next.slug + "/"} class="page-nav-link">
          <span class="page-nav-direction">下一页</span>
          <span class="page-nav-title">{next.title}</span>
        </a>
      {/if}
    </div>
  </nav>
{/if}

<style>
  .page-nav {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    margin-top: var(--space-12);
    padding-top: var(--space-6);
    border-top: 1px solid var(--color-border);
  }

  .page-nav-prev,
  .page-nav-next {
    flex: 1;
  }

  .page-nav-next {
    text-align: right;
  }

  .page-nav-link {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-decoration: none;
  }

  .page-nav-link:hover {
    text-decoration: none;
  }

  .page-nav-direction {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    color: var(--color-muted);
  }

  .page-nav-title {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-accent);
  }

  .page-nav-link:hover .page-nav-title {
    text-decoration: underline;
  }
</style>
