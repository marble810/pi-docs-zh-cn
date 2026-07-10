<script lang="ts">
  import "../app.css";
  import SiteHeader from "$lib/components/SiteHeader.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";

  type SyncMetadata = {
    upstreamCommit: string;
    publishedAt: string;
    sourceSite: string;
    targetLocale: string;
    lastModelUsed?: string;
  };

  let {
    data,
    children
  }: {
    data: { syncMeta: SyncMetadata };
    children: import("svelte").Snippet;
  } = $props();
</script>

<SiteHeader>
  {#snippet mobileNav()}
    <p class="mobile-nav-placeholder">导航加载中...</p>
  {/snippet}
</SiteHeader>

<main class="main-content">
  {@render children()}
</main>

<SiteFooter syncMeta={data.syncMeta} />

<style>
  .main-content {
    min-height: calc(100vh - var(--header-height) - 200px);
  }
</style>
