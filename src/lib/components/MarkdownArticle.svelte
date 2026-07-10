<script lang="ts">
  let { html = "" }: { html?: string } = $props();
</script>

<article class="markdown-article">
  {@html html}
</article>

<style>
  .markdown-article {
    font-family: var(--font-serif);
    font-size: var(--text-base);
    line-height: var(--leading-relaxed);
    color: var(--color-fg);
    max-width: 100%;
  }

  .markdown-article :global(h1:first-child) {
    margin-top: 0;
  }

  .markdown-article :global(a) {
    color: var(--color-accent);
    text-decoration: none;
  }

  .markdown-article :global(a:hover) {
    text-decoration: underline;
  }

  .markdown-article :global(code) {
    font-family: var(--font-mono);
    font-size: 0.875em;
    background: var(--color-code-bg);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }

  .markdown-article :global(pre) {
    background: var(--color-code-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    overflow-x: auto;
    margin: var(--space-4) 0;
    font-size: var(--text-sm);
    line-height: var(--leading-normal);
  }

  .markdown-article :global(pre code) {
    background: transparent;
    padding: 0;
    font-size: inherit;
  }

  .markdown-article :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: var(--space-4) 0;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
  }

  .markdown-article :global(th),
  .markdown-article :global(td) {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    text-align: left;
  }

  .markdown-article :global(th) {
    background: var(--color-surface);
    font-weight: 600;
  }

  .markdown-article :global(img) {
    border-radius: var(--radius-md);
    margin: var(--space-4) 0;
  }

  .markdown-article :global(blockquote) {
    border-left: 3px solid var(--color-accent);
    padding-left: var(--space-4);
    margin: var(--space-4) 0;
    color: var(--color-muted);
  }

  .markdown-article :global(.heading-wrapper) {
    text-decoration: none;
    color: inherit;
  }

  .markdown-article :global(.heading-wrapper:hover) {
    text-decoration: none;
  }
</style>
