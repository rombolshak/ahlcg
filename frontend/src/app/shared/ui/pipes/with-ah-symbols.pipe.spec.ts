import { WithAhSymbolsPipe } from './with-ah-symbols.pipe';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('WithAhSymbolsPipe', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideExperimentalZonelessChangeDetection(),
        {
          provide: DomSanitizer,
          useValue: {
            sanitize: (x: string) => x,
            bypassSecurityTrustHtml: (x: string) => x,
          },
        },
      ],
    }).compileComponents();
  });

  it('create an instance', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));

    expect(pipe).toBeTruthy();
  });

  it('replaces symbol if needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));

    expect(pipe.transform('one symbol #q# is @f@ replaced')).toEqual(
      'one symbol <span class="font-[AHSymbol]">q</span> is <span class="font-[ArnoProBold] italic">f</span> replaced',
    );
  });

  it('replaces two symbols if needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));

    expect(pipe.transform('two consecutive symbols #cc# or @ff@ too')).toEqual(
      'two consecutive symbols <span class="font-[AHSymbol]">cc</span> or <span class="font-[ArnoProBold] italic">ff</span> too',
    );
  });

  it('replaces several occurences if needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));

    expect(
      pipe.transform(
        'several replacements by one symbol #c# and #d# succeeded',
      ),
    ).toEqual(
      'several replacements by one symbol <span class="font-[AHSymbol]">c</span> and <span class="font-[AHSymbol]">d</span> succeeded',
    );
  });

  it('doesnt replace symbol if not needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));

    expect(pipe.transform('abcde')).toEqual('abcde');
  });
});
