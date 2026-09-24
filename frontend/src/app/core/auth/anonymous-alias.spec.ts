import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { getTranslocoModule } from '@testing/transloco.testing';
import { anonymousAlias, anonymousAliasKeys, ARCHETYPE_POOL_SIZE, QUIRK_POOL_SIZE } from './anonymous-alias';
import { User } from './auth.service';

const anonymousUser = (userName: string): User => ({ isAnonymous: true, email: null, userName });
const permanentUser = (userName: string): User => ({ isAnonymous: false, email: 'a@example.com', userName });

describe('anonymousAliasKeys', () => {
  it('should always derive the same keys from the same userName', () => {
    expect(anonymousAliasKeys('guid-123')).toEqual(anonymousAliasKeys('guid-123'));
  });

  it('should derive different pairs for different userNames', () => {
    expect(anonymousAliasKeys('11111111-1111-1111-1111-111111111111')).not.toEqual(anonymousAliasKeys('22222222-2222-2222-2222-222222222222'));
  });

  it('should keep the quirk index in 1…30 and the archetype index in 1…26 across a sweep of generated GUIDs', () => {
    for (let i = 0; i < 500; i++) {
      const { quirk, archetype } = anonymousAliasKeys(crypto.randomUUID());
      const quirkIndex = Number(/^quirk\.(\d+)$/.exec(quirk)?.[1]);
      const archetypeIndex = Number(/^archetype\.(\d+)$/.exec(archetype)?.[1]);

      expect(quirkIndex).toBeGreaterThanOrEqual(1);
      expect(quirkIndex).toBeLessThanOrEqual(QUIRK_POOL_SIZE);
      expect(archetypeIndex).toBeGreaterThanOrEqual(1);
      expect(archetypeIndex).toBeLessThanOrEqual(ARCHETYPE_POOL_SIZE);
    }
  });

  it('should derive valid keys rather than throw for a userName that is not a GUID', () => {
    expect(() => anonymousAliasKeys('not-a-guid')).not.toThrow();
    expect(anonymousAliasKeys('not-a-guid')).toEqual({ quirk: 'quirk.27', archetype: 'archetype.11' });
  });
});

describe('anonymousAlias', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [getTranslocoModule()],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('should render the drawn alias for an anonymous user', () => {
    const user = signal<User | undefined>(anonymousUser('guid-123'));

    const alias = TestBed.runInInjectionContext(() => anonymousAlias(user));
    TestBed.tick();

    expect(alias()).toBe('Paranoid Preacher');
  });

  it('should be empty for a permanent user', () => {
    const user = signal<User | undefined>(permanentUser('Alice'));

    const alias = TestBed.runInInjectionContext(() => anonymousAlias(user));
    TestBed.tick();

    expect(alias()).toBe('');
  });

  it('should be empty for a signed-out user', () => {
    const user = signal<User | undefined>(undefined);

    const alias = TestBed.runInInjectionContext(() => anonymousAlias(user));
    TestBed.tick();

    expect(alias()).toBe('');
  });
});
