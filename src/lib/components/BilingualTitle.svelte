<script lang="ts">
  import { parseBilingualTitle } from "$lib/bilingual.js";

  let {
    text = "",
    size = "nav"
  }: {
    text?: string;
    /** display = page H1; group = sidebar section; nav = nav item; inline = page-nav/search */
    size?: "display" | "group" | "nav" | "inline";
  } = $props();

  const parts = $derived(parseBilingualTitle(text));
  /** display = stacked (zh over en); others keep inline 中文｜en */
  const stacked = $derived(size === "display");
</script>

<span class="bilingual-title bilingual-title--{size}">
  <span class="bilingual-title__zh">{parts.zh}</span>
  {#if parts.en}
    {#if !stacked}
      <span class="bilingual-title__sep" aria-hidden="true">|</span>
    {/if}
    <span class="bilingual-title__en">{parts.en}</span>
  {/if}
</span>
