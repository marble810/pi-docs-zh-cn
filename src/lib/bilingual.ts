/** Split `中文|English` titles. */
export type BilingualParts = {
  zh: string;
  en?: string;
};

export function parseBilingualTitle(text: string): BilingualParts {
  const raw = text?.trim() ?? "";
  if (!raw) return { zh: "" };

  const idx = raw.indexOf("|") !== -1 ? raw.indexOf("|") : raw.indexOf("｜");
  if (idx === -1) return { zh: raw };

  const zh = raw.slice(0, idx).trim();
  const en = raw.slice(idx + 1).trim();
  if (!zh) return { zh: raw };
  if (!en) return { zh };
  return { zh, en };
}
