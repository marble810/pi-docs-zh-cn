<script lang="ts">
  import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    open = $bindable(false),
    trigger,
    content
  }: {
    open?: boolean;
    trigger?: Snippet;
    content?: Snippet;
  } = $props();
</script>

<BitsDropdownMenu.Root bind:open>
  <BitsDropdownMenu.Trigger>
    {#if trigger}
      {@render trigger()}
    {/if}
  </BitsDropdownMenu.Trigger>

  <BitsDropdownMenu.Content>
    {#if content}
      {@render content()}
    {/if}
  </BitsDropdownMenu.Content>
</BitsDropdownMenu.Root>
