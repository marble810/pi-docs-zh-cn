<script lang="ts">
  let { html = "" }: { html?: string } = $props();
</script>

<article class="markdown-article">
  {@html html}
</article>

<style>
  .markdown-article {
    font-family: var(--font-serif);
    font-size: var(--text-body);
    line-height: var(--leading-normal);
    color: var(--color-fg);
    max-width: 100%;
  }

  .markdown-article :global(h1:first-child) {
    margin-top: 0;
  }

  /* Stacked bilingual page title (layout tokens live in app.css) */
  .markdown-article :global(h1.bilingual-title--display) {
    margin-bottom: var(--space-6);
  }

  .markdown-article :global(a) {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: color-mix(in srgb, var(--color-accent) 65%, transparent);
    text-underline-offset: var(--space-0-5);
  }

  .markdown-article :global(a:hover) {
    color: var(--color-accent);
    text-decoration-color: currentColor;
  }

  /* Heading permalink: plain # symbol, not a wrapped title link */
  .markdown-article :global(a.heading-anchor) {
    display: inline-flex;
    align-items: center;
    margin-left: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 400;
    line-height: 1;
    color: var(--color-muted);
    text-decoration: none;
    opacity: 0;
    transition:
      opacity var(--transition-fast),
      color var(--transition-fast);
  }

  .markdown-article :global(h1:hover > a.heading-anchor),
  .markdown-article :global(h2:hover > a.heading-anchor),
  .markdown-article :global(h3:hover > a.heading-anchor),
  .markdown-article :global(h4:hover > a.heading-anchor),
  .markdown-article :global(a.heading-anchor:focus-visible),
  .markdown-article :global(a.heading-anchor:hover) {
    opacity: 1;
    color: var(--color-accent);
    text-decoration: none;
  }

  .markdown-article :global(h1.bilingual-title--display > a.heading-anchor) {
    margin-left: 0;
    font-size: var(--text-xl);
  }

  .markdown-article :global(code) {
    font-family: var(--font-mono);
    font-size: var(--text-code-inline);
    background: var(--color-code-bg);
    border: 1px solid var(--color-border);
    padding: var(--space-px) var(--space-1-5);
    border-radius: var(--radius-sm);
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }

  .markdown-article :global(pre) {
    background: var(--color-code-block-bg) !important;
    color: var(--color-code-block-fg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-5);
    overflow-x: auto;
    margin: var(--space-5) 0;
    font-size: var(--text-code-sm);
    line-height: var(--leading-snug);
  }

  .markdown-article :global(pre code) {
    background: transparent;
    border: 0;
    border-radius: var(--radius-sm);
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
</style>
