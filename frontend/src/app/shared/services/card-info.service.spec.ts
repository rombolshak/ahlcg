import { TestBed } from '@angular/core/testing';

import { CardInfoService } from './card-info.service';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { cardE } from '../domain/test/entities/test-cards';
import { provideHttpClient } from '@angular/common/http';
import { toObservable } from '@angular/core/rxjs-interop';

describe('CardInfoService', () => {
  let service: CardInfoService;
  let http: HttpTestingController;
  const transloco = {
    langChanges$: new BehaviorSubject('en'),
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
      toObservable(service.getCardInfo({ set: '02', index: '107' })).subscribe(
        (data) => {
          console.log('CARDINFO', data);

          expect(data).toBeTruthy();
          expect(data).toEqual(cardE.info);
          expect(data?.traits?.length ?? 0).toEqual(2);

          http.verify();
          done();
        },
      );
    });

    http.expectOne('/assets/cards/02/107.json').flush({
      fields: ['title', 'flavor'],
      traits: ['insight', 'tactic'],
      abilities: 1,
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });
    http.expectOne('/assets/i18n/generated/cards/02/107/en.json').flush({
      title: '"I\'ve got a plan!"',
      flavor:
        '"That\'s the worst plan I\'ve ever heard.\n Well, what are we waiting for?"',
      a1: '<b>Fight</b>. This attack uses #i#. You deal +1 damage for this attack for each clue you have (max +3 damage).',
    });
    http.expectOne('/assets/i18n/generated/traits/en.json').flush({
      insight: 'Insight',
      tactic: 'Tactic',
    });
  });

  it('should throw for incorrect description (non existent field)', (done) => {
    TestBed.runInInjectionContext(() => {
      toObservable(service.getCardInfo({ set: '02', index: '107' }))
        .pipe(
          catchError((err: Error) => {
            return of(err);
          }),
        )
        .subscribe((data) => {
          expect(data).toBeInstanceOf(Error);
          expect((data as Error).message).toContain('nonexistent');

          http.verify();
          done();
        });
    });

    http.expectOne('/assets/cards/02/107.json').flush({
      fields: ['title', 'flavor', 'nonexistent'],
      traits: ['insight', 'tactic'],
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });
    http.expectOne('/assets/i18n/generated/cards/02/107/en.json');
    http.expectOne('/assets/i18n/generated/traits/en.json');
  });

  it('should throw for incorrect description (missing required fields)', (done) => {
    TestBed.runInInjectionContext(() => {
      toObservable(service.getCardInfo({ set: '02', index: '107' }))
        .pipe(
          catchError((err: Error) => {
            return of(err);
          }),
        )
        .subscribe((data) => {
          expect(data).toBeInstanceOf(Error);
          expect((data as Error).message).toContain('title');

          http.verify();
          done();
        });
    });

    http.expectOne('/assets/cards/02/107.json').flush({
      fields: ['flavor'],
      traits: ['insight', 'tactic'],
      abilities: 1,
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });
    http.expectOne('/assets/i18n/generated/cards/02/107/en.json').flush({
      title: '"I\'ve got a plan!"',
      flavor:
        '"That\'s the worst plan I\'ve ever heard.\n Well, what are we waiting for?"',
      a1: '<b>Fight</b>. This attack uses #i#. You deal +1 damage for this attack for each clue you have (max +3 damage).',
    });
    http.expectOne('/assets/i18n/generated/traits/en.json').flush({
      insight: 'Insight',
      tactic: 'Tactic',
    });
  });

  it('should throw for incorrect strings', (done) => {
    TestBed.runInInjectionContext(() => {
      toObservable(service.getCardInfo({ set: '02', index: '107' }))
        .pipe(
          catchError((err: Error) => {
            return of(err);
          }),
        )
        .subscribe((data) => {
          expect(data).toBeInstanceOf(Error);
          expect((data as Error).message).toContain('a1');

          http.verify();
          done();
        });
    });

    http.expectOne('/assets/cards/02/107.json').flush({
      fields: ['title', 'flavor'],
      traits: ['insight', 'tactic'],
      abilities: 1,
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });
    http.expectOne('/assets/i18n/generated/cards/02/107/en.json').flush({
      title: '"I\'ve got a plan!"',
      flavor:
        '"That\'s the worst plan I\'ve ever heard.\n Well, what are we waiting for?"',
    });
    http.expectOne('/assets/i18n/generated/traits/en.json').flush({
      insight: 'Insight',
      tactic: 'Tactic',
    });
  });

  it('should throw for missing traits', (done) => {
    TestBed.runInInjectionContext(() => {
      toObservable(service.getCardInfo({ set: '02', index: '107' }))
        .pipe(
          catchError((err: Error) => {
            return of(err);
          }),
        )
        .subscribe((data) => {
          expect(data).toBeInstanceOf(Error);
          expect((data as Error).message).toContain('tactic');

          http.verify();
          done();
        });
    });

    http.expectOne('/assets/cards/02/107.json').flush({
      fields: ['title', 'flavor'],
      traits: ['insight', 'tactic'],
      abilities: 1,
      copyright: {
        illustrator: 'Robert Laskey',
        ffg: '2016',
      },
    });
    http.expectOne('/assets/i18n/generated/cards/02/107/en.json').flush({
      title: '"I\'ve got a plan!"',
      flavor:
        '"That\'s the worst plan I\'ve ever heard.\n Well, what are we waiting for?"',
    });
    http.expectOne('/assets/i18n/generated/traits/en.json').flush({
      insight: 'Insight',
    });
  });
});
