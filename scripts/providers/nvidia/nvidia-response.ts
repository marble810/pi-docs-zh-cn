import { z } from "zod";

export type NvidiaChatResponse = {
  id: string;
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export const TranslationResponseSchema = z
  .object({
    translations: z.array(
      z
        .object({
          id: z.string().min(1),
          text: z.string().min(1)
        })
        .strict()
    )
  })
  .strict();

export type ValidatedTranslationResponse = z.infer<typeof TranslationResponseSchema>;

export function validateResponseShape(data: unknown): ValidatedTranslationResponse {
  return TranslationResponseSchema.parse(data);
}
