import type { NvidiaConfig } from "./nvidia-config.js";

export class NvidiaClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;
  private rateLimitIntervalMs: number;
  private lastRequestTime = 0;

  constructor(private config: NvidiaConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeoutMs = config.requestTimeoutMs;
    this.rateLimitIntervalMs = Math.ceil(60_000 / config.requestsPerMinute);
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const wait = this.lastRequestTime + this.rateLimitIntervalMs - now;
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    this.lastRequestTime = Date.now();
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json"
    };
  }

  async get<T>(path: string): Promise<T> {
    await this.throttle();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: this.headers(),
        signal: controller.signal
      });

      if (!res.ok) {
        throw await buildHttpError(res, `${this.baseUrl}${path}`);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
      timer.unref?.();
    }
  }

  async post<T>(path: string, body: unknown, retries = 1): Promise<T> {
    await this.throttle();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
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
          console.log(`      ⚠ Rate limited, waiting ${err.retryAfter}s`);
          await new Promise((r) => setTimeout(r, err.retryAfter * 1000));
          continue;
        }

        if (err instanceof HttpError) {
          // Don't retry auth errors
          if (err.status === 401 || err.status === 403) throw err;
          if (attempt < retries) {
            console.log(`      ⚠ HTTP ${err.status}, retry ${attempt + 1}/${retries}`);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw err;
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

  /** Poll until job completes or timeout */
  async pollUntilDone<T>(
    path: string,
    isDone: (resp: T) => boolean,
    timeoutMs = this.config.pollTimeoutMs
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await this.get<T>(path);
      if (isDone(result)) return result;
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new TimeoutError(`Poll timeout after ${timeoutMs}ms: ${path}`);
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

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
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
