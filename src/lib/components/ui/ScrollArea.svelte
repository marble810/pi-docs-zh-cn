<script lang="ts">
  import { ScrollArea as BitsScrollArea } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    type = "hover",
    children
  }: {
    type?: "hover" | "scroll" | "auto" | "always";
    children?: Snippet;
  } = $props();
</script>

<BitsScrollArea.Root {type} class="scroll-area">
  <BitsScrollArea.Viewport>
    {#if children}
      {@render children()}
    {/if}
  </BitsScrollArea.Viewport>
  <BitsScrollArea.Scrollbar orientation="vertical">
    <BitsScrollArea.Thumb />
  </BitsScrollArea.Scrollbar>
  <BitsScrollArea.Scrollbar orientation="horizontal">
    <BitsScrollArea.Thumb />
  </BitsScrollArea.Scrollbar>
  <BitsScrollArea.Corner />
</BitsScrollArea.Root>
