import { TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CardInfo } from '@domain/entities/details/card-info.model';
import { cardE } from '@domain/test/entities/test-cards';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject, filter, firstValueFrom, of } from 'rxjs';
import { CardInfoService } from './card-info.service';

describe('CardInfoService', () => {
  let service: CardInfoService;
  let http: HttpTestingController;
  const transloco = {
    langChanges$: new BehaviorSubject('en'),
    load: () => of({}),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: TranslocoService,
          useValue: transloco,
        },
      ],
    });
    transloco.langChanges$.next('en');
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(CardInfoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load json files', async () => {
    const id = signal(cardE);
    const data$ = TestBed.runInInjectionContext(() => toObservable(service.getCardInfo(id)));
    const dataPromise = firstValueFrom(data$.pipe(filter((data): data is CardInfo => data !== undefined)));

    TestBed.tick();
    http.expectOne('/assets/cards/02/107.json').flush({
      fields: ['title', 'flavor'],
      traits: ['insight', 'tactic'],
      abilities: 1,
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });

    const data = await dataPromise;

    expect(data).toBeTruthy();
    expect(data).toEqual({
      title: 'cards/02/107.title',
      traits: ['traits.insight', 'traits.tactic'],
      abilities: ['cards/02/107.a1'],
      flavor: 'cards/02/107.flavor',
      setInfo: {
        set: '02',
        index: '107',
      },
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });

    http.verify();
  });

  it('should throw for incorrect description (non existent field)', async () => {
    const id = signal(cardE);
    const data$ = TestBed.runInInjectionContext(() => toObservable(service.getCardInfo(id)));
    const dataPromise = firstValueFrom(data$.pipe(filter((data): data is CardInfo => data !== undefined)));

    TestBed.tick();
    http.expectOne('/assets/cards/02/107.json').flush({
      fields: ['title', 'flavor', 'nonexistent'],
      traits: ['insight', 'tactic'],
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });

    const data = await dataPromise;

    expect(data.isLoadedWithError).toBe(true);
    expect(data.title).toContain('nonexistent');

    http.verify();
  });

  it('should throw for incorrect description (missing required fields)', async () => {
    const id = signal(cardE);
    const data$ = TestBed.runInInjectionContext(() => toObservable(service.getCardInfo(id)));
    const dataPromise = firstValueFrom(data$.pipe(filter((data): data is CardInfo => data !== undefined)));

    TestBed.tick();
    http.expectOne('/assets/cards/02/107.json').flush({
      fields: ['flavor'],
      traits: ['insight', 'tactic'],
      abilities: 1,
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });

    const data = await dataPromise;

    expect(data.isLoadedWithError).toBe(true);
    expect(data.title).toContain('title');

    http.verify();
  });
});
