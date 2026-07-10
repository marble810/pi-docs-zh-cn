<script lang="ts">
  import { page } from "$app/stores";
  import { base } from "$app/paths";
</script>

<svelte:head>
  <title>404 — Pi 中文文档</title>
</svelte:head>

<div class="error-page">
  <h1 class="error-code">404</h1>
  <p class="error-message">页面未找到</p>
  <p class="error-path">{base}{$page.url.pathname}</p>
  <a href={base + "/"} class="error-link">返回首页</a>
</div>

<style>
  .error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    text-align: center;
    padding: var(--space-8);
  }

  .error-code {
    font-size: 6rem;
    font-weight: 700;
    color: var(--color-muted);
    margin: 0;
    line-height: 1;
  }

  .error-message {
    font-family: var(--font-sans);
    font-size: var(--text-xl);
    color: var(--color-fg);
    margin: var(--space-4) 0;
  }

  .error-path {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-muted);
    margin-bottom: var(--space-6);
  }

  .error-link {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 500;
    padding: 10px 24px;
    background: var(--color-accent);
    color: white;
    border-radius: var(--radius-md);
    text-decoration: none;
  }

  .error-link:hover {
    background: var(--color-accent-hover);
    text-decoration: none;
  }
</style>
