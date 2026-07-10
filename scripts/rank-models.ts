import type { OpenRouterModel, ModelHistory } from "./lib/types.js";

export interface RankedModel {
  model: OpenRouterModel;
  score: number;
}

/**
 * Rank models by:
 * 1. Category priority (models with "free" in name first)
 * 2. Intelligence sort (context_length descending, then by name)
 * 3. Model history score (success rate, latency)
 */
export function rankModels(models: OpenRouterModel[], history?: ModelHistory): RankedModel[] {
  const scored: RankedModel[] = models.map((model) => {
    let score = 0;

    // Category: free models get priority
    if (model.id.includes("free")) score += 1000;

    // Intelligence: larger context = higher score
    score += Math.min(model.context_length / 1024, 100);

    // History-based adjustment
    if (history?.models[model.id]) {
      const h = history.models[model.id];
      const successRate = h.successes / Math.max(h.attempts, 1);
      score += successRate * 50;
      // Bonus for low latency
      score += Math.max(0, 30 - h.averageLatencyMs / 1000);
    }

    return { model, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored;
}
