<script lang="ts">
  import { Tooltip as BitsTooltip } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    trigger,
    content
  }: {
    trigger?: Snippet;
    content?: Snippet;
  } = $props();
</script>

<BitsTooltip.Root>
  <BitsTooltip.Trigger>
    {#if trigger}
      {@render trigger()}
    {/if}
  </BitsTooltip.Trigger>
  <BitsTooltip.Content>
    {#if content}
      {@render content()}
    {/if}
  </BitsTooltip.Content>
</BitsTooltip.Root>
