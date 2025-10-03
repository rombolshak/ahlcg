import { TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection, signal } from '@angular/core';
import { testEnemy } from 'shared/domain/test/entities/test-enemies';
import { InvestigatorS } from 'shared/domain/test/entities/test-investigators';
import { NoThreatsPhraseService } from './no-threats-phrase.service';

describe('NoThreatsPhraseService', () => {
  let service: NoThreatsPhraseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(NoThreatsPhraseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should provide a string for investigator', () => {
    const model = signal(InvestigatorS);
    const testee = service.getPhrase(model);

    expect(testee()).toBeTruthy();
  });

  it('should provide empty string for null', () => {
    const model = signal(null);
    const testee = service.getPhrase(model);

    expect(testee()).toBe('');
  });

  it('should change string on threats gone', () => {
    const model = signal(InvestigatorS);
    const testee = service.getPhrase(model);

    model.update((gator) => ({ ...gator, threatArea: [testEnemy.id] }));
    const initial = testee();
    model.update((gator) => ({ ...gator, threatArea: [] }));
    const final = testee();

    expect(final).not.toEqual(initial);
  });

  it('should be the same string on different changes', () => {
    const model = signal(InvestigatorS);
    const testee = service.getPhrase(model);

    model.update((gator) => ({ ...gator, threatArea: [testEnemy.id] }));
    model.update((gator) => ({ ...gator, threatArea: [] }));
    const initial = testee();
    model.update((gator) => ({ ...gator, tokens: { clue: 3 } }));
    const final = testee();

    expect(final).toEqual(initial);
  });
});
