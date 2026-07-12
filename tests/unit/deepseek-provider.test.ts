import { afterEach, describe, expect, it, vi } from "vitest";
import { DeepSeekClient, HttpError } from "../../scripts/providers/deepseek/deepseek-client.js";
import { loadDeepSeekConfig } from "../../scripts/providers/deepseek/deepseek-config.js";
import { classifyDeepSeekError } from "../../scripts/providers/deepseek/deepseek-errors.js";
import { DeepSeekProvider } from "../../scripts/providers/deepseek/deepseek-provider.js";
import {
  buildStructuredJsonBody,
  parseStructuredJsonResponse
} from "../../scripts/providers/deepseek/deepseek-structured-json.js";

const config = {
  apiKey: "test-key",
  baseUrl: "https://api.deepseek.com",
  model: "deepseek-v4-flash",
  requestTimeoutMs: 10_000,
  maxRequestsPerRun: 10,
  maxModelAttempts: 2
};

const batch = {
  segments: [{ id: "one", source: "Hello", sectionPath: [], protectedTokens: [] }],
  targetLocale: "zh-CN" as const,
  glossary: {},
  preserve: [],
  systemPrompt: "Return JSON",
  maxOutputTokens: 100
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("DeepSeek configuration and protocol", () => {
  it("requires a key, defaults to the required model, and rejects model routing", () => {
    expect(() => loadDeepSeekConfig({})).toThrow("DEEPSEEK_API_KEY");
    expect(loadDeepSeekConfig({ DEEPSEEK_API_KEY: "test" }).model).toBe("deepseek-v4-flash");
    expect(() =>
      loadDeepSeekConfig({ DEEPSEEK_API_KEY: "test", DEEPSEEK_MODEL: "other" })
    ).toThrow();
  });

  it("builds and parses the structured translation JSON contract", () => {
    const body = buildStructuredJsonBody("deepseek-v4-flash", batch);
    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(JSON.parse(body.messages[1].content).segments).toEqual(batch.segments);

    expect(
      parseStructuredJsonResponse(
        '{"translations":[{"id":"one","text":"你好"}]}',
        "structured-json",
        "deepseek-v4-flash"
      ).translations
    ).toEqual([{ id: "one", text: "你好" }]);
    expect(() =>
      parseStructuredJsonResponse(
        '{"translations":[{"id":"one","text":""}]}',
        "structured-json",
        "deepseek-v4-flash"
      )
    ).toThrow();
  });
});

describe("DeepSeek HTTP integration", () => {
  it("uses the official chat completions URL, bearer auth, and exact model", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "response",
          choices: [{ message: { content: '{"translations":[{"id":"one","text":"你好"}]}' } }]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const provider = new DeepSeekProvider(config);
    const [candidate] = await provider.getCandidateModels();

    await provider.translateBatch(batch, candidate);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    expect(JSON.parse(String(init?.body)).model).toBe("deepseek-v4-flash");
  });

  it("keeps authentication failures fatal without retrying", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const client = new DeepSeekClient(config);

    await expect(client.post("/chat/completions", {}, 1)).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(classifyDeepSeekError(new HttpError(401, "", "url")).fatal).toBe(true);
  });

  it.each([
    ["429", () => new Response("busy", { status: 429, headers: { "Retry-After": "0" } })],
    ["5xx", () => new Response("temporary", { status: 500 })],
    ["network", () => Promise.reject(new TypeError("fetch failed"))]
  ])("retries transient %s failures", async (_name, firstResult) => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(firstResult as typeof fetch)
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    const promise = new DeepSeekClient(config).post<{ ok: boolean }>("/chat/completions", {}, 1);

    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
