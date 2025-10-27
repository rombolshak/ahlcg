import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { WithAhSymbolsPipe } from './with-ah-symbols.pipe';

describe('WithAhSymbolsPipe', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: DomSanitizer,
          useValue: {
            sanitize: (x: string) => x,
            bypassSecurityTrustHtml: (x: string) => x,
          },
        },
      ],
      imports: [WithAhSymbolsPipe],
    }).compileComponents();
  });

  it('create an instance', () => {
    const pipe = TestBed.runInInjectionContext(() => new WithAhSymbolsPipe());

    expect(pipe).toBeTruthy();
  });

  it('replaces symbol if needed', () => {
    const pipe = TestBed.runInInjectionContext(() => new WithAhSymbolsPipe());

    expect(pipe.transform('one symbol #q# is @f@ replaced')).toEqual(
      'one symbol <span class="font-[AHSymbol] text-xs">q</span> is <span class="font-[ArnoProBold] italic">f</span> replaced',
    );
  });

  it('replaces two symbols if needed', () => {
    const pipe = TestBed.runInInjectionContext(() => new WithAhSymbolsPipe());

    expect(pipe.transform('two consecutive symbols #cc# or @ff@ too')).toEqual(
      'two consecutive symbols <span class="font-[AHSymbol] text-xs">cc</span> or <span class="font-[ArnoProBold] italic">ff</span> too',
    );
  });

  it('replaces several occurrences if needed', () => {
    const pipe = TestBed.runInInjectionContext(() => new WithAhSymbolsPipe());

    expect(
      pipe.transform(
        'several replacements by one symbol #c# and #d# succeeded',
      ),
    ).toEqual(
      'several replacements by one symbol <span class="font-[AHSymbol] text-xs">c</span> and <span class="font-[AHSymbol] text-xs">d</span> succeeded',
    );
  });

  it('doesnt replace symbol if not needed', () => {
    const pipe = TestBed.runInInjectionContext(() => new WithAhSymbolsPipe());

    expect(pipe.transform('abcde')).toEqual('abcde');
  });
});
