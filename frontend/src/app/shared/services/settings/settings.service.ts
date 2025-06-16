import {
  effect,
  inject,
  Injectable,
  InjectionToken,
  signal,
  Signal,
} from '@angular/core';
import { diff } from 'deep-object-diff';

const STORAGE_KEY_PREFIX = 'ahlcg_';
export const DEFAULT_SETTINGS = new InjectionToken('Default settings value');
export const STORAGE_KEY_SUFFIX = new InjectionToken<string>(
  'Storage key suffix',
);

@Injectable({
  providedIn: 'root',
})
export class SettingsService<T extends object> {
  private readonly defaultSettings = inject<T>(DEFAULT_SETTINGS);
  private readonly storageKeySuffix = inject(STORAGE_KEY_SUFFIX);

  private readonly storageKey = STORAGE_KEY_PREFIX + this.storageKeySuffix;
  private readonly settings = signal<T>(this.defaultSettings);

  constructor() {
    this.loadSettings();
    effect(() => {
      const changes = diff(this.defaultSettings, this.settings());
      localStorage.setItem(this.storageKey, JSON.stringify(changes));
    });
  }

  private loadSettings(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as T;
        const settings = { ...this.settings(), ...parsed };
        this.settings.set(settings);
      } catch {
        this.setDefaultPreferences();
      }
    } else {
      this.setDefaultPreferences();
    }
  }

  setDefaultPreferences(): void {
    this.settings.set(this.defaultSettings);
  }

  get(): Signal<T> {
    return this.settings.asReadonly();
  }

  set(settings: T): void {
    this.settings.set(settings);
  }

  update<K extends keyof T>(key: K, value: T[K]): void {
    const current = this.settings();
    const updated = { ...current, [key]: value };
    this.set(updated);
  }
}
