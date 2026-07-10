<script lang="ts">
  import type { LayoutData } from "./$types.js";
  import DocsSidebar from "$lib/components/DocsSidebar.svelte";
  import DocsToc from "$lib/components/DocsToc.svelte";
  import { page } from "$app/stores";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } = $props();

  let navigation = $derived(data.navigation);
  let headings = $derived(
    ($page.data as { headings?: Array<{ id: string; text: string; depth: 2 | 3 }> })?.headings || []
  );
</script>

<div class="docs-layout">
  <div class="docs-sidebar-col">
    <DocsSidebar {navigation} />
  </div>

  <main class="docs-main-col">
    {@render children()}
  </main>

  <div class="docs-toc-col">
    <DocsToc {headings} />
  </div>
</div>

<style>
  .docs-layout {
    display: flex;
    max-width: 1280px;
    margin: 0 auto;
    min-height: calc(100vh - var(--header-height));
  }

  .docs-sidebar-col {
    display: none;
  }

  @media (min-width: 900px) {
    .docs-sidebar-col {
      display: block;
    }
  }

  .docs-main-col {
    flex: 1;
    min-width: 0;
    padding: var(--space-10) var(--space-8);
    max-width: var(--content-max-width);
  }

  .docs-toc-col {
    display: none;
  }

  @media (min-width: 1100px) {
    .docs-toc-col {
      display: block;
    }
  }

  @media (max-width: 768px) {
    .docs-main-col {
      padding: var(--space-6) var(--space-4);
      max-width: 100%;
    }
  }
</style>
