import { LangDefinition } from '@jsverse/transloco';

export interface LangCoverage {
  id: string;
  label: string;
  coverage: number;
}

/**
 * Languages at or above `threshold`, combined with any whose id appears in `explicitIds` regardless
 * of coverage — an explicit choice (a `?lang=` override or a persisted preference) widens what the
 * app offers, it never falls back to English.
 */
export function resolveAvailableLangs(coverage: readonly LangCoverage[], threshold: number, explicitIds: readonly string[]): LangDefinition[] {
  return coverage.filter(entry => entry.coverage >= threshold || explicitIds.includes(entry.id)).map(({ id, label }) => ({ id, label }));
}
