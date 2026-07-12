import type { ProviderErrorInfo } from "../provider.js";
import { HttpError, RateLimitError } from "./deepseek-client.js";

export function classifyDeepSeekError(error: unknown): ProviderErrorInfo {
  if (error instanceof HttpError) {
    return classifyHttpStatus(error.status, error.message);
  }

  if (error instanceof RateLimitError) {
    return { kind: "rate-limit", safeMessage: error.message, fatal: false };
  }

  if (error instanceof SyntaxError) {
    return { kind: "invalid-json", safeMessage: error.message, fatal: false };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (error.name === "AbortError") {
      return { kind: "timeout", safeMessage: "DeepSeek request timed out", fatal: false };
    }
    if (msg.includes("deepseek_max_requests_per_run")) {
      return { kind: "config-error", safeMessage: error.message, fatal: true };
    }
    if (msg.includes("auth") || msg.includes("unauthorized") || msg.includes("key")) {
      return { kind: "auth", safeMessage: error.message, fatal: true };
    }
    if (msg.includes("quota") || msg.includes("exceeded") || msg.includes("insufficient")) {
      return { kind: "quota", safeMessage: error.message, fatal: true };
    }
    if (msg.includes("not found") || msg.includes("model")) {
      return { kind: "model-unavailable", safeMessage: error.message, fatal: false };
    }
    if (msg.includes("missing 'translations'") || msg.includes("schema")) {
      return { kind: "schema-mismatch", safeMessage: error.message, fatal: false };
    }
    if (msg.includes("missing segments") || msg.includes("segment id")) {
      return { kind: "missing-segments", safeMessage: error.message, fatal: false };
    }
    if (msg.includes("placeholder")) {
      return { kind: "placeholder-mismatch", safeMessage: error.message, fatal: false };
    }
    if (msg.includes("no <segment> tags") || msg.includes("tags")) {
      return { kind: "tags-broken", safeMessage: error.message, fatal: false };
    }
    if (msg.includes("untranslated") || msg.includes("english")) {
      return { kind: "untranslated", safeMessage: error.message, fatal: false };
    }
    if (msg.includes("empty") || msg.includes("null")) {
      return { kind: "empty-response", safeMessage: error.message, fatal: false };
    }

    return { kind: "unknown", safeMessage: error.message, fatal: false };
  }

  return { kind: "unknown", safeMessage: String(error), fatal: false };
}

function classifyHttpStatus(status: number, message: string): ProviderErrorInfo {
  switch (status) {
    case 401:
    case 403:
      return { kind: "auth", safeMessage: message, fatal: true };
    case 429:
      return { kind: "rate-limit", safeMessage: message, fatal: false };
    case 404:
      return { kind: "model-unavailable", safeMessage: message, fatal: false };
    case 408:
      return { kind: "timeout", safeMessage: message, fatal: false };
    case 500:
    case 502:
    case 503:
    case 504:
      return { kind: "server-error", safeMessage: message, fatal: false };
    default:
      return {
        kind: status >= 400 && status < 500 ? "config-error" : "unknown",
        safeMessage: message,
        fatal: status >= 400 && status < 500
      };
  }
}
