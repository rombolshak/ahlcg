import { TestBed } from '@angular/core/testing';

import { CardInfoService } from './card-info.service';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { BehaviorSubject, of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { provideHttpClient } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';
import { cardE } from '../domain/test/entities/test-cards';

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

  it('should load json files', (done) => {
    TestBed.runInInjectionContext(() => {
      const id = signal(cardE);
      toObservable(service.getCardInfo(id)).subscribe((data) => {
        if (!data) return;

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
        done();
      });
    });

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
  });

  it('should throw for incorrect description (non existent field)', (done) => {
    TestBed.runInInjectionContext(() => {
      const id = signal(cardE);
      toObservable(service.getCardInfo(id)).subscribe({
        next: (data) => {
          if (!data) return;

          expect(data.isLoadedWithError).toBeTrue();
          expect(data.title).toContain('nonexistent');

          http.verify();
          done();
        },
      });
    });

    TestBed.tick();
    http.expectOne('/assets/cards/02/107.json').flush({
      fields: ['title', 'flavor', 'nonexistent'],
      traits: ['insight', 'tactic'],
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });
  });

  it('should throw for incorrect description (missing required fields)', (done) => {
    TestBed.runInInjectionContext(() => {
      const id = signal(cardE);
      toObservable(service.getCardInfo(id)).subscribe((data) => {
        if (!data) return;

        expect(data.isLoadedWithError).toBeTrue();
        expect(data.title).toContain('title');

        http.verify();
        done();
      });
    });

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
  });
});
