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
    expect(pipe.transform('ab#c#de@f@g')).toEqual(
      'ab<span class="font-ah-symbol">c</span>de<span class="font-arno-bold italic">f</span>g',
    );
  });

  it('replaces two symbols if needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));
    expect(pipe.transform('ab#cc#de@ff@g')).toEqual(
      'ab<span class="font-ah-symbol">cc</span>de<span class="font-arno-bold italic">ff</span>g',
    );
  });

  it('doesnt replace symbol if not needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));
    expect(pipe.transform('abcde')).toEqual('abcde');
  });
});
