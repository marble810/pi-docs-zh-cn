<script lang="ts">
  import { Accordion as BitsAccordion } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    type = "single",
    value,
    children
  }: {
    type?: "single" | "multiple";
    value?: string | string[];
    children?: Snippet;
  } = $props();
</script>

<BitsAccordion.Root {type} value={value as never}>
  {#if children}
    {@render children()}
  {/if}
</BitsAccordion.Root>
