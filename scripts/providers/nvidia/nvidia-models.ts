import type { NvidiaClient } from "./nvidia-client.js";

type NvidiaModelListResponse = {
  object: "list";
  data: Array<{
    id: string;
    object: "model";
    created?: number;
    owned_by?: string;
  }>;
};

/** Returns null if query failed (all models treated as unknown). Returns a Set (possibly empty) on success. */
export async function fetchAvailableModelIds(client: NvidiaClient): Promise<Set<string> | null> {
  try {
    const response = await client.get<NvidiaModelListResponse>("/models");
    const ids = response.data.map((m) => m.id);
    console.log(`   📡 /v1/models: ${ids.length} models available`);
    return new Set(ids);
  } catch (err) {
    console.log(`   ⚠ /v1/models query failed: ${(err as Error).message}`);
    console.log("   Will try all configured models directly (available=unknown)");
    return null;
  }
}

export function setContainsModels(
  available: Set<string>,
  modelIds: string[]
): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];
  for (const id of modelIds) {
    if (available.has(id)) {
      found.push(id);
    } else {
      missing.push(id);
    }
  }
  return { found, missing };
}
