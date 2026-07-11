<script lang="ts">
  import { base } from "$app/paths";

  let {
    syncMeta
  }: { syncMeta?: { upstreamCommit?: string; publishedAt?: string; sourceSite?: string } } =
    $props();
</script>

<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-main">
      <p class="footer-disclaimer">此站点为 Pi 文档的中文社区翻译，非官方版本。</p>
    </div>

    <div class="footer-meta">
      {#if syncMeta}
        <div class="footer-info">
          <span class="footer-label">上游来源：</span>
          <a
            href="https://github.com/{syncMeta.sourceSite?.replace('https://', '')}"
            target="_blank"
            rel="noopener"
          >
            {syncMeta.sourceSite}
          </a>
        </div>
        <div class="footer-info">
          <span class="footer-label">同步提交：</span>
          <code class="footer-commit">{syncMeta.upstreamCommit?.slice(0, 12) || "—"}</code>
        </div>
        <div class="footer-info">
          <span class="footer-label">最后同步：</span>
          <time datetime={syncMeta.publishedAt}
            >{syncMeta.publishedAt
              ? new Date(syncMeta.publishedAt).toLocaleDateString("zh-CN")
              : "—"}</time
          >
        </div>
      {/if}
    </div>

    <div class="footer-bottom">
      <a href={base + "/"}>首页</a>
      <a href="https://github.com/marble810/pi-docs-zh-cn" target="_blank" rel="noopener">GitHub</a
      >
    </div>
  </div>
</footer>

<style>
  .site-footer {
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
    margin-top: var(--space-16);
  }

  .footer-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .footer-disclaimer {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-muted);
    margin: 0;
  }

  .footer-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .footer-info {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-muted);
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .footer-label {
    font-weight: 500;
  }

  .footer-commit {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    background: var(--color-code-bg);
    padding: 1px 4px;
    border-radius: var(--radius-sm);
  }

  .footer-bottom {
    display: flex;
    gap: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .footer-bottom a {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    color: var(--color-muted);
    text-decoration: none;
  }

  .footer-bottom a:hover {
    color: var(--color-accent);
  }
</style>
