import { describe, it, expect } from "vitest";
import { rankModels } from "../../scripts/rank-models.js";
import type { OpenRouterModel, ModelHistory } from "../../scripts/lib/types.js";

function makeModel(id: string, context: number): OpenRouterModel {
  return {
    id,
    context_length: context,
    pricing: { prompt: "0", completion: "0", request: "0" },
    architecture: { input_modalities: ["text"], output_modalities: ["text"] },
    supported_parameters: ["response_format"]
  };
}

describe("rankModels", () => {
  it("puts free models first", () => {
    const models = [makeModel("openai/gpt-4", 128000), makeModel("openrouter/free", 32768)];
    const ranked = rankModels(models);
    expect(ranked[0].model.id).toBe("openrouter/free");
  });

  it("sorts by context length after free", () => {
    const models = [makeModel("model/small", 32768), makeModel("model/large", 65536)];
    const ranked = rankModels(models);
    expect(ranked[0].model.id).toBe("model/large");
  });

  it("uses history data", () => {
    const models = [makeModel("model/a", 32768), makeModel("model/b", 32768)];
    const history: ModelHistory = {
      models: {
        "model/a": {
          attempts: 10,
          successes: 9,
          transportFailures: 1,
          schemaFailures: 0,
          placeholderFailures: 0,
          languageFailures: 0,
          semanticFailures: 0,
          averageLatencyMs: 500,
          lastSuccessAt: "2025-01-01"
        }
      }
    };
    const ranked = rankModels(models, history);
    // model/a has history, so should rank higher than model/b with same context
    expect(ranked[0].model.id).toBe("model/a");
  });
});
