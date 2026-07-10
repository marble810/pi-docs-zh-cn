<script lang="ts">
  let { code = "", lang = "" }: { code?: string; lang?: string } = $props();

  let copied = $state(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // clipboard unavailable
    }
  }
</script>

<div class="code-block">
  {#if lang}
    <div class="code-header">
      <span class="code-lang">{lang}</span>
      <button class="copy-btn" onclick={handleCopy}>
        {copied ? "已复制" : "复制"}
      </button>
    </div>
  {/if}
  {@html code}
</div>
