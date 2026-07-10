// OpenRouter chat completion client (types live in ./lib/types.ts for consumers)

export interface ChatCompletionRequest {
  model: string;
  messages: { role: string; content: string }[];
  response_format: { type: "json_schema"; json_schema: Record<string, unknown> };
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  choices: { message: { content: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export class OpenRouterClient {
  private baseUrl: string;
  private apiKey: string;
  private maxRetries: number;

  constructor(apiKey: string, maxRetries = 1) {
    this.apiKey = apiKey;
    this.baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
    this.maxRetries = maxRetries;
  }

  private async rawRequest(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`
    };

    if (process.env.OPENROUTER_SITE_URL) {
      headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
    }
    if (process.env.OPENROUTER_APP_NAME) {
      headers["X-Title"] = process.env.OPENROUTER_APP_NAME;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(req)
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
      throw new RateLimitError(retryAfter);
    }

    if (!res.ok) {
      throw new TransportError(`HTTP ${res.status}: ${res.statusText}`);
    }

    return (await res.json()) as ChatCompletionResponse;
  }

  async complete(req: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const start = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = attempt * 2000;
          console.log(`      ⏳ Retry ${attempt} after ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        }

        const response = await this.rawRequest(req);
        const latencyMs = Date.now() - start;
        const content = response.choices?.[0]?.message?.content ?? "";
        const tokens = response.usage?.prompt_tokens ?? 0;
        const compTokens = response.usage?.completion_tokens ?? 0;
        console.log(`      ⚡ ${req.model}: ${latencyMs}ms, ${tokens}+${compTokens} tokens`);

        return {
          content,
          modelUsed: req.model,
          latencyMs,
          usage: response.usage
        };
      } catch (err) {
        lastError = err as Error;
        if (err instanceof RateLimitError) {
          console.log(`      ⚠ Rate limited, waiting ${err.retryAfter}s`);
          await new Promise((r) => setTimeout(r, err.retryAfter * 1000));
        } else {
          console.log(`      ⚠ Transport error: ${(err as Error).message}`);
        }
      }
    }

    return {
      content: "",
      modelUsed: req.model,
      latencyMs: Date.now() - start,
      error: lastError?.message ?? "Unknown error"
    };
  }
}

export interface ChatCompletionResult {
  content: string;
  modelUsed: string;
  latencyMs: number;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: string;
}

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super(`Rate limited, retry after ${retryAfter}s`);
    this.retryAfter = retryAfter;
  }
}

export class TransportError extends Error {
  constructor(msg: string) {
    super(`Transport error: ${msg}`);
  }
}
