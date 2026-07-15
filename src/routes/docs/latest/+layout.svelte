<script lang="ts">
  import type { LayoutData } from "./$types.js";
  import Dialog from "$lib/components/ui/Dialog.svelte";
  import MobileNavigation from "$lib/components/MobileNavigation.svelte";
  import DocsSidebar from "$lib/components/DocsSidebar.svelte";
  import DocsToc from "$lib/components/DocsToc.svelte";
  import { mobileNavOpen } from "$lib/stores/ui.js";
  import { page } from "$app/stores";

  let { data, children }: { data: LayoutData; children: import("svelte").Snippet } = $props();

  let navigation = $derived(data.navigation);
  let headings = $derived(
    ($page.data as { headings?: Array<{ id: string; text: string; depth: 2 | 3 }> })?.headings || []
  );

  let mobileDialogOpen = $state(false);

  // Sync with global mobile nav store
  $effect(() => {
    const unsub = mobileNavOpen.subscribe((v) => (mobileDialogOpen = v));
    return () => unsub();
  });

  // When dialog closes via Bits UI, sync back to store
  $effect(() => {
    if (!mobileDialogOpen) {
      mobileNavOpen.set(false);
    }
  });

  function onMobileNav() {
    mobileDialogOpen = false;
    mobileNavOpen.set(false);
  }
</script>

<Dialog bind:open={mobileDialogOpen} class="mobile-nav-dialog">
  {#snippet content()}
    <MobileNavigation {navigation} onNavigate={onMobileNav} />
  {/snippet}
</Dialog>

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
    display: grid;
    grid-template-columns: var(--sidebar-width) minmax(0, var(--content-max-width)) var(
        --toc-width
      );
    column-gap: var(--space-4);
    justify-content: center;
    align-items: start;
    width: 100%;
    margin: 0 auto;
    min-height: calc(100vh - var(--header-height));
    padding: var(--space-4) var(--space-8) var(--space-8);
  }

  /* Framed panels: sidebar / main / toc */
  .docs-sidebar-col,
  .docs-main-col,
  .docs-toc-col {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .docs-sidebar-col {
    display: none;
    position: sticky;
    top: calc(var(--header-height) + var(--space-4));
    height: calc(100vh - var(--header-height) - var(--space-8));
    overflow: hidden;
  }

  @media (min-width: 900px) {
    .docs-sidebar-col {
      display: block;
    }
  }

  .docs-main-col {
    min-width: 0;
    padding: var(--space-10) var(--space-8) var(--space-12);
  }

  .docs-toc-col {
    display: none;
    position: sticky;
    top: calc(var(--header-height) + var(--space-4));
    max-height: calc(100vh - var(--header-height) - var(--space-8));
    overflow-y: auto;
  }

  @media (min-width: 1100px) {
    .docs-toc-col {
      display: block;
    }
  }

  @media (max-width: 1100px) {
    .docs-layout {
      grid-template-columns: var(--sidebar-width) minmax(0, var(--content-max-width));
    }
  }

  @media (max-width: 768px) {
    .docs-layout {
      display: block;
      padding: var(--space-4) var(--space-5) var(--space-8);
    }

    .docs-main-col {
      padding: var(--space-8) var(--space-5) var(--space-12);
      max-width: 100%;
    }

    .docs-sidebar-col,
    .docs-toc-col {
      border: 0;
      background: transparent;
    }
  }

  /* Mobile nav dialog: full-height drawer on small screens */
  :global(.mobile-nav-dialog) {
    position: fixed;
    top: 0;
    left: 0;
    width: min(var(--drawer-width), 80vw);
    height: 100dvh;
    background: var(--color-bg);
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
    z-index: var(--z-overlay);
  }
</style>
