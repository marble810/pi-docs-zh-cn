<script lang="ts">
  import type { PageData } from "./$types.js";
  import TranslationNotice from "$lib/components/TranslationNotice.svelte";
  import MarkdownArticle from "$lib/components/MarkdownArticle.svelte";
  import PageNavigation from "$lib/components/PageNavigation.svelte";

  let data: PageData = $props();
</script>

<svelte:head>
  <title>Pi 中文文档</title>
</svelte:head>

<TranslationNotice />
<MarkdownArticle html={data.html} />
<PageNavigation current={undefined} allPages={data.manifest} />
