<script lang="ts">
  let { html = "" }: { html?: string } = $props();
</script>

<article class="markdown-article">
  {@html html}
</article>

<style>
  .markdown-article {
    font-family: var(--font-serif);
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--color-fg);
    max-width: 100%;
  }

  .markdown-article :global(h1:first-child) {
    margin-top: 0;
  }

  .markdown-article :global(a) {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--color-accent) 65%, transparent);
    text-underline-offset: 0.14em;
  }

  .markdown-article :global(a:hover) {
    color: var(--color-accent);
    text-decoration-color: currentColor;
  }

  .markdown-article :global(code) {
    font-family: var(--font-mono);
    font-size: 0.82em;
    background: var(--color-code-bg);
    border: 1px solid var(--color-border);
    padding: 1px 5px;
    border-radius: 2px;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }

  .markdown-article :global(pre) {
    background: var(--color-code-block-bg) !important;
    color: var(--color-code-block-fg);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 18px;
    overflow-x: auto;
    margin: var(--space-5) 0;
    font-size: 0.78rem;
    line-height: 1.55;
  }

  .markdown-article :global(pre code) {
    background: transparent;
    border: 0;
    border-radius: 0;
    padding: 0;
    font-size: inherit;
  }

  .markdown-article :global(pre.shiki span) {
    color: var(--shiki-dark) !important;
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
    border-left: 1px solid var(--color-border);
    padding-left: var(--space-4);
    margin: var(--space-5) 0;
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
