import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { CONFIG_DIR } from "./paths.js";

const upstreamSchema = z.object({
  repository: z.string(),
  branch: z.string(),
  docsPath: z.string(),
  sourceSite: z.string(),
  targetLocale: z.string()
});

const glossarySchema = z.object({
  version: z.number(),
  preserve: z.array(z.string()),
  terms: z.record(z.string())
});

const policySchema = z.object({
  version: z.number(),
  maxSegmentsPerBatch: z.number(),
  maxInputCharactersPerBatch: z.number(),
  maxFilesPerBatch: z.number(),
  maxRequestsPerRun: z.number(),
  maxConcurrency: z.number(),
  minimumRequestIntervalMs: z.number(),
  maxContextLength: z.number(),
  minContextLength: z.number(),
  priceValidation: z.object({
    prompt: z.number(),
    completion: z.number(),
    request: z.number(),
    internalReasoning: z.number()
  }),
  modelFilters: z.object({
    inputModalities: z.array(z.string()),
    outputModalities: z.array(z.string()),
    supportedParameters: z.array(z.string()),
    excludeExpiringWithinDays: z.number()
  }),
  fallback: z.object({
    finalRouter: z.string(),
    maxRetriesPerModel: z.number(),
    circuitBreakerFailures: z.number()
  })
});

const navigationOverridesSchema = z.object({
  groups: z.record(
    z.object({
      title: z.string()
    })
  )
});

function loadYaml<T>(file: string, schema: z.ZodType<T>): T {
  const text = fs.readFileSync(path.join(CONFIG_DIR, file), "utf-8");
  const parsed = yaml.load(text);
  return schema.parse(parsed);
}

export function loadUpstreamConfig() {
  return loadYaml("upstream.yml", upstreamSchema);
}

export function loadGlossary() {
  return loadYaml("glossary.yml", glossarySchema);
}

export function loadTranslationPolicy() {
  return loadYaml("translation-policy.yml", policySchema);
}

export function loadNavigationOverrides() {
  return loadYaml("navigation-overrides.yml", navigationOverridesSchema);
}

export function loadTranslationPrompt(): string {
  return fs.readFileSync(path.join(CONFIG_DIR, "translation-prompt.md"), "utf-8");
}

export function getConfigVersions() {
  return {
    promptVersion: hashString(loadTranslationPrompt()),
    glossaryVersion: String(loadGlossary().version),
    translationPolicyVersion: String(loadTranslationPolicy().version)
  };
}

export function hashString(input: string): string {
  // Simple stable hash for versioning; not cryptographic.
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0");
}
