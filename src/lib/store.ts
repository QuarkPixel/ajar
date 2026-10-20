/**
 * Persistence for the single list of intention rules.
 *
 * There is exactly one setting in this extension — the list itself — so the
 * whole store is one array under one key.
 */

import type { Rule } from './rules';

const STORAGE_KEY = 'intentions';

/** Only used when the pages are opened outside an extension (design preview). */
let memoryFallback: Rule[] = [];

const hasExtensionStorage = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);

const sanitize = (input: unknown): Rule[] => {
  if (!Array.isArray(input)) return [];
  const rules: Rule[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<Rule>;
    if (typeof candidate.id !== 'string') continue;
    rules.push({
      id: candidate.id,
      url: typeof candidate.url === 'string' ? candidate.url : '',
      phrase: typeof candidate.phrase === 'string' ? candidate.phrase : '',
    });
  }
  return rules;
};

export async function getRules(): Promise<Rule[]> {
  if (!hasExtensionStorage()) return memoryFallback;

  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return sanitize(stored[STORAGE_KEY]);
  } catch {
    return [];
  }
}

export async function setRules(rules: Rule[]): Promise<void> {
  if (!hasExtensionStorage()) {
    memoryFallback = rules;
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: rules });
}

export function newRule(): Rule {
  return { id: crypto.randomUUID(), url: '', phrase: '' };
}
