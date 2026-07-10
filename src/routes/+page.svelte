<script lang="ts">
  import type { PageData } from "./$types.js";
  import { base } from "$app/paths";

  let { data }: { data: PageData } = $props();
  let meta = $derived(data.meta);
</script>

<svelte:head>
  <title>Pi 中文文档 — 社区翻译</title>
  <meta name="description" content="Pi 框架的简体中文社区文档翻译" />
</svelte:head>

<div class="home">
  <section class="hero">
    <h1 class="hero-title">Pi 中文文档</h1>
    <p class="hero-subtitle">Pi 框架的简体中文社区翻译站点</p>

    <div class="hero-actions">
      <a href={base + "/docs/latest/"} class="btn-primary">开始阅读</a>
      <a
        href="https://github.com/liangkeren/pi-docs-zh-cn"
        target="_blank"
        rel="noopener"
        class="btn-secondary">GitHub 仓库</a
      >
    </div>
  </section>

  <section class="info-cards">
    {#if meta}
      <div class="card">
        <h3>上游仓库</h3>
        <p>{meta.sourceSite || "—"}</p>
      </div>
      <div class="card">
        <h3>同步提交</h3>
        <code>{meta.upstreamCommit?.slice(0, 12) || "—"}</code>
      </div>
      <div class="card">
        <h3>最后同步</h3>
        <time datetime={meta.publishedAt}>
          {meta.publishedAt ? new Date(meta.publishedAt).toLocaleDateString("zh-CN") : "—"}
        </time>
      </div>
      {#if meta.lastModelUsed}
        <div class="card">
          <h3>翻译模型</h3>
          <code>{meta.lastModelUsed}</code>
        </div>
      {/if}
    {/if}
  </section>

  <section class="disclaimer-section" data-testid="disclaimer">
    <div class="disclaimer-card">
      <h3>非官方声明</h3>
      <p>
        此站点为 Pi
        文档的简体中文社区翻译，并非官方版本。文档内容通过自动化流程从上游仓库同步，并使用 AI
        模型辅助翻译。可能存在翻译不准确或更新延迟的情况。最新信息请参考 <a
          href="https://pi.dev/docs/latest"
          target="_blank"
          rel="noopener">原始英文文档</a
        >。
      </p>
    </div>

    <div class="disclaimer-card">
      <h3>自动翻译说明</h3>
      <p>
        本翻译内容由 AI 模型自动生成，经过人工校对流程但仍可能存在不一致之处。如发现翻译问题，欢迎在 <a
          href="https://github.com/liangkeren/pi-docs-zh-cn"
          target="_blank"
          rel="noopener">GitHub 仓库</a
        > 提交 Issue 或 Pull Request。
      </p>
    </div>
  </section>
</div>

<style>
  .home {
    max-width: var(--content-max-width);
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
  }

  .hero {
    text-align: center;
    padding: var(--space-16) 0 var(--space-10);
  }

  .hero-title {
    font-size: var(--text-4xl);
    margin: 0 0 var(--space-4);
  }

  .hero-subtitle {
    font-family: var(--font-sans);
    font-size: var(--text-lg);
    color: var(--color-muted);
    margin: 0 0 var(--space-8);
  }

  .hero-actions {
    display: flex;
    gap: var(--space-4);
    justify-content: center;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    padding: 10px 24px;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 500;
    color: white;
    background: var(--color-accent);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background var(--transition-fast);
  }

  .btn-primary:hover {
    background: var(--color-accent-hover);
    text-decoration: none;
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    padding: 10px 24px;
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-fg);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: all var(--transition-fast);
  }

  .btn-secondary:hover {
    background: var(--color-surface-hover);
    text-decoration: none;
  }

  .info-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-4);
    margin: var(--space-10) 0;
  }

  .card {
    padding: var(--space-4);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
  }

  .card h3 {
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    margin: 0 0 var(--space-2);
  }

  .card p,
  .card code {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    margin: 0;
  }

  .card code {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    background: var(--color-code-bg);
    padding: 1px 4px;
    border-radius: var(--radius-sm);
  }

  .disclaimer-section {
    display: grid;
    gap: var(--space-4);
    margin: var(--space-8) 0;
  }

  .disclaimer-card {
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-warning-bg);
    border-color: var(--color-warning-border);
  }

  .disclaimer-card h3 {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    font-weight: 600;
    margin: 0 0 var(--space-2);
    color: var(--color-warning-fg);
  }

  .disclaimer-card p {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    margin: 0;
    color: var(--color-warning-fg);
    line-height: var(--leading-normal);
  }
</style>
