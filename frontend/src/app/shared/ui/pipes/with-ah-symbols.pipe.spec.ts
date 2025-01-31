import { WithAhSymbolsPipe } from './with-ah-symbols.pipe';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

describe('WithAhSymbolsPipe', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
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

    expect(pipe.transform('ab#q#de@f@g')).toEqual(
      'ab<span class="font-[AHSymbol]">q</span>de<span class="font-[ArnoProBold] italic">f</span>g',
    );
  });

  it('replaces two symbols if needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));

    expect(pipe.transform('ab#cc#de@ff@g')).toEqual(
      'ab<span class="font-[AHSymbol]">cc</span>de<span class="font-[ArnoProBold] italic">ff</span>g',
    );
  });

  it('replaces several occurences if needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));

    expect(pipe.transform('ab#c#q#d#e')).toEqual(
      'ab<span class="font-[AHSymbol]">c</span>q<span class="font-[AHSymbol]">d</span>e',
    );
  });

  it('doesnt replace symbol if not needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));

    expect(pipe.transform('abcde')).toEqual('abcde');
  });
});
