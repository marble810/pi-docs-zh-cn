import type { DeepSeekConfig } from "./deepseek-config.js";

export class DeepSeekClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;
  private requestCount = 0;

  constructor(private config: DeepSeekConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.requestTimeoutMs;
  }

  private claimRequest(): void {
    if (this.requestCount >= this.config.maxRequestsPerRun) {
      throw new Error(`DEEPSEEK_MAX_REQUESTS_PER_RUN exceeded (${this.config.maxRequestsPerRun})`);
    }
    this.requestCount++;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
  }

  async post<T>(
    path: string,
    body: unknown,
    retries = this.config.maxModelAttempts - 1
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      this.claimRequest();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(body),
          signal: controller.signal
        });

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
          throw new RateLimitError(retryAfter, `${this.baseUrl}${path}`);
        }

        if (!res.ok) {
          throw await buildHttpError(res, `${this.baseUrl}${path}`);
        }

        return (await res.json()) as T;
      } catch (err) {
        lastError = err as Error;

        if (err instanceof RateLimitError) {
          if (attempt >= retries) throw err;
          const backoff = Math.min(err.retryAfter * 2 ** attempt, 60);
          console.log(
            `      ⚠ Rate limited, backing off ${backoff}s (attempt ${attempt + 1}/${retries + 1})`
          );
          await new Promise((r) => setTimeout(r, backoff * 1000));
          continue;
        }

        if (err instanceof HttpError) {
          // Configuration/authentication/client errors are fatal; only transient 5xx responses retry.
          if (err.status < 500 || attempt >= retries) throw err;
          const backoff = Math.min(5 * 2 ** attempt, 120);
          console.log(
            `      ⚠ HTTP ${err.status}, backing off ${backoff}s (attempt ${attempt + 1}/${retries + 1})`
          );
          await new Promise((r) => setTimeout(r, backoff * 1000));
          continue;
        }

        // Timeout / network error - retry
        if (attempt < retries) {
          console.log(`      ⚠ Network error, retry ${attempt + 1}/${retries}`);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new Error("Unknown error");
  }
}

export class HttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, url: string) {
    super(`HTTP ${status} from ${url}: ${body.slice(0, 200)}`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

export class RateLimitError extends Error {
  retryAfter: number;

  constructor(retryAfter: number, url: string) {
    super(`Rate limited (Retry-After: ${retryAfter}s) at ${url}`);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

async function buildHttpError(res: Response, url: string): Promise<HttpError> {
  let body = "";
  try {
    body = await res.text();
  } catch {
    // ignore
  }
  return new HttpError(res.status, body, url);
}
