import { describe, it, expect } from "vitest";
import type { OpenRouterModel } from "../../scripts/lib/types.js";

/**
 * Free price filter tests.
 * A model qualifies as "free" when prompt=0, completion=0, request=0.
 */
describe("Free price filter", () => {
  function isFree(model: OpenRouterModel): boolean {
    const p = model.pricing;
    return Number(p.prompt) === 0 && Number(p.completion) === 0 && Number(p.request) === 0;
  }

  function makeModel(overrides: Partial<OpenRouterModel>): OpenRouterModel {
    return {
      id: "test/model",
      name: "Test Model",
      context_length: 32768,
      pricing: { prompt: "0", completion: "0", request: "0" },
      ...overrides
    };
  }

  it("recognizes a free model", () => {
    expect(isFree(makeModel({}))).toBe(true);
  });

  it("rejects a model with non-zero prompt cost", () => {
    const model = makeModel({ pricing: { prompt: "5e-7", completion: "0", request: "0" } });
    expect(isFree(model)).toBe(false);
  });

  it("rejects a model with non-zero completion cost", () => {
    const model = makeModel({ pricing: { prompt: "0", completion: "1e-6", request: "0" } });
    expect(isFree(model)).toBe(false);
  });

  it("rejects a model with non-zero request cost", () => {
    const model = makeModel({ pricing: { prompt: "0", completion: "0", request: "1e-5" } });
    expect(isFree(model)).toBe(false);
  });

  it("handles string and number pricing values", () => {
    const strModel = makeModel({
      pricing: { prompt: "0", completion: "0", request: "0" }
    });
    expect(isFree(strModel)).toBe(true);

    // Pricing as numbers
    const numModel: OpenRouterModel = {
      id: "free/model",
      context_length: 8192,
      pricing: { prompt: "0", completion: "0", request: "0" }
    };
    expect(isFree(numModel)).toBe(true);
  });

  it("filters free models from a list", () => {
    const models: OpenRouterModel[] = [
      makeModel({
        id: "free/model-a",
        pricing: { prompt: "0", completion: "0", request: "0" }
      }),
      makeModel({
        id: "paid/model-b",
        pricing: { prompt: "5e-7", completion: "1e-6", request: "0" }
      }),
      makeModel({
        id: "free/model-c",
        pricing: { prompt: "0", completion: "0", request: "0" }
      })
    ];
    const freeModels = models.filter(isFree);
    expect(freeModels).toHaveLength(2);
    expect(freeModels.map((m) => m.id)).toEqual(["free/model-a", "free/model-c"]);
  });
});
