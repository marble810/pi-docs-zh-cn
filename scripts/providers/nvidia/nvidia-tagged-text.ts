import type {
  TranslationBatchRequest,
  TranslationBatchResult,
  TranslationProtocol
} from "../provider.js";

export function buildTaggedTextBody(
  model: string,
  batch: TranslationBatchRequest
): {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: Array<{ role: string; content: string }>;
} {
  const instruction = [
    "Translate the following software documentation from English to Simplified Chinese.",
    "",
    "Requirements:",
    "- Preserve every <segment> element and its id attribute exactly.",
    "- Translate only the content inside each segment.",
    "- Preserve every {{PLACEHOLDER}} exactly as-is.",
    "- Do not add explanations or summaries.",
    "- Do not translate product names, code, commands, paths, URLs, package names, or identifiers.",
    "- Return only the translated segments, nothing else."
  ].join("\n");

  const segmentsXml = batch.segments
    .map((seg) => `\n<segment id="${seg.id}">\n${seg.source}\n</segment>`)
    .join("\n");

  const userContent = `${instruction}\n${segmentsXml}`;

  return {
    model,
    temperature: 0,
    max_tokens: batch.maxOutputTokens,
    messages: [{ role: "user", content: userContent }]
  };
}

export function parseTaggedTextResponse(
  content: string,
  protocol: TranslationProtocol,
  modelId: string
): TranslationBatchResult {
  const translations: Array<{ id: string; text: string }> = [];

  // Parse <segment id="...">...</segment> tags using a simple XML parser
  // We use a regex-based tag matcher with position tracking
  const segmentRegex = /<segment\s+id="([^"]+)"\s*>([\s\S]*?)<\/segment>/g;
  let match: RegExpExecArray | null;

  while ((match = segmentRegex.exec(content)) !== null) {
    translations.push({
      id: match[1],
      text: match[2].trim()
    });
  }

  if (translations.length === 0) {
    throw new Error("No <segment> tags found in Riva response");
  }

  return {
    translations,
    metadata: {
      provider: "nvidia-nim",
      requestedModel: modelId,
      actualModel: modelId,
      protocol,
      latencyMs: 0 // filled by caller
    }
  };
}
