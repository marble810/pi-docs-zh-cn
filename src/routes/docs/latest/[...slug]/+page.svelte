<script lang="ts">
  import type { PageData } from "./$types.js";
  import TranslationNotice from "$lib/components/TranslationNotice.svelte";
  import MarkdownArticle from "$lib/components/MarkdownArticle.svelte";
  import PageNavigation from "$lib/components/PageNavigation.svelte";

  let data: PageData = $props();

  const currentPage = $derived(data.manifest.find((p) => p.slug === data.slug));
</script>

<svelte:head>
  <title>{data.title || "文档"} — Pi 中文文档</title>
  {#if data.description}
    <meta name="description" content={data.description} />
  {/if}
</svelte:head>

<TranslationNotice />
<MarkdownArticle html={data.html} />
<PageNavigation current={currentPage} allPages={data.manifest} />
