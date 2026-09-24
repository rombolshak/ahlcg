import { computed, inject, Signal } from '@angular/core';
import { translateSignal, TranslocoService } from '@jsverse/transloco';
import { User } from './auth.service';
import { I18N_SCOPE } from './i18n/scope';

/** Bounds of the `quirk` and `archetype` pools in `i18n/en.json` — each is the sole source of its own size. */
export const QUIRK_POOL_SIZE = 30;
export const ARCHETYPE_POOL_SIZE = 26;

/** FNV-1a, 32-bit. Deterministic and fast; cryptographic strength is not the point. */
function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Derives the two scope-relative translation keys for an anonymous account's alias from its
 * `userName`. Stable for any given input and independent of whether that input is actually a
 * GUID — the whole string is hashed, so there is no format to reject.
 */
export function anonymousAliasKeys(userName: string): { quirk: string; archetype: string } {
  const hash = fnv1a(userName);
  const quirkIndex = (hash % QUIRK_POOL_SIZE) + 1;
  const archetypeIndex = (Math.floor(hash / QUIRK_POOL_SIZE) % ARCHETYPE_POOL_SIZE) + 1;
  return { quirk: `quirk.${String(quirkIndex)}`, archetype: `archetype.${String(archetypeIndex)}` };
}

/** Empty for a signed-out or permanent user; otherwise the alias drawn from the account's `userName`. */
export function anonymousAlias(user: Signal<User | undefined>): Signal<string> {
  const transloco = inject(TranslocoService);

  const keys = computed(() => {
    const current = user();
    return current?.isAnonymous ? anonymousAliasKeys(current.userName ?? '') : undefined;
  });
  const quirkKey = computed(() => keys()?.quirk ?? '');
  const archetypeKey = computed(() => keys()?.archetype ?? '');
  const words = translateSignal([quirkKey, archetypeKey], {}, I18N_SCOPE);

  return computed(() => {
    if (keys() === undefined) return '';
    const [quirk = '', archetype = ''] = words();
    return transloco.translate('pattern', { quirk, archetype }, I18N_SCOPE);
  });
}
