import { describe, it, expect } from "vitest";
import type { OpenRouterModel } from "../../scripts/lib/types.js";

/**
 * Model capability filter tests.
 * Filters based on input/output modalities and supported parameters.
 */
describe("Model capability filter", () => {
  function supportsTextOnly(model: OpenRouterModel): boolean {
    const arch = model.architecture;
    if (!arch) return false;
    const input = arch.input_modalities ?? [];
    const output = arch.output_modalities ?? [];
    return input.every((m) => m === "text") && output.every((m) => m === "text");
  }

  function supportsResponseFormat(model: OpenRouterModel): boolean {
    return (model.supported_parameters ?? []).includes("response_format");
  }

  function makeModel(overrides: Partial<OpenRouterModel>): OpenRouterModel {
    return {
      id: "test/model",
      context_length: 32768,
      pricing: { prompt: "0", completion: "0", request: "0" },
      architecture: {
        input_modalities: ["text"],
        output_modalities: ["text"]
      },
      supported_parameters: ["response_format"],
      ...overrides
    };
  }

  it("passes text-only models", () => {
    expect(supportsTextOnly(makeModel({}))).toBe(true);
  });

  it("rejects models with image input modality", () => {
    const model = makeModel({
      architecture: {
        input_modalities: ["text", "image"],
        output_modalities: ["text"]
      }
    });
    expect(supportsTextOnly(model)).toBe(false);
  });

  it("rejects models with audio output modality", () => {
    const model = makeModel({
      architecture: {
        input_modalities: ["text"],
        output_modalities: ["text", "audio"]
      }
    });
    expect(supportsTextOnly(model)).toBe(false);
  });

  it("rejects models without architecture field", () => {
    const model = makeModel({ architecture: undefined });
    expect(supportsTextOnly(model)).toBe(false);
  });

  it("checks response_format support", () => {
    expect(supportsResponseFormat(makeModel({}))).toBe(true);
    const noParam = makeModel({ supported_parameters: [] });
    expect(supportsResponseFormat(noParam)).toBe(false);
    const undefinedParam = makeModel({ supported_parameters: undefined });
    expect(supportsResponseFormat(undefinedParam)).toBe(false);
  });

  it("applies all filters together", () => {
    const models: OpenRouterModel[] = [
      makeModel({ id: "good/model-1" }),
      makeModel({
        id: "bad/modality",
        architecture: {
          input_modalities: ["text", "image"],
          output_modalities: ["text"]
        }
      }),
      makeModel({
        id: "bad/params",
        supported_parameters: []
      }),
      makeModel({ id: "good/model-2" })
    ];

    const filtered = models.filter((m) => supportsTextOnly(m) && supportsResponseFormat(m));
    expect(filtered).toHaveLength(2);
    expect(filtered.map((m) => m.id)).toEqual(["good/model-1", "good/model-2"]);
  });
});
