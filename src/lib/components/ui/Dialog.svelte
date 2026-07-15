<script lang="ts">
  import { Dialog as BitsDialog } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    open = $bindable(false),
    trigger,
    content,
    class: className = ""
  }: {
    open?: boolean;
    trigger?: Snippet;
    content?: Snippet;
    class?: string;
  } = $props();
</script>

<BitsDialog.Root bind:open>
  {#if trigger}
    <BitsDialog.Trigger>
      {@render trigger()}
    </BitsDialog.Trigger>
  {/if}

  <BitsDialog.Content class={className}>
    {#if content}
      {@render content()}
    {/if}
    <BitsDialog.Close>
      <button class="dialog-close-btn" aria-label="关闭">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </BitsDialog.Close>
  </BitsDialog.Content>
</BitsDialog.Root>

<style>
  .dialog-close-btn {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--size-control-md);
    height: var(--size-control-md);
    border: none;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
  }

  .dialog-close-btn:hover {
    background: var(--color-surface-hover);
  }
</style>
