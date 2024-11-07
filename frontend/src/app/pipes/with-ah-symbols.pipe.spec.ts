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
            bypassSecurityTrustHtml: (x: string) => x
          }
        }
      ]
    }).compileComponents();
  });

  it('create an instance', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));
    expect(pipe).toBeTruthy();
  });

  it('replaces symbol if needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));
    expect(pipe.transform('ab#c#de')).toEqual('ab<span class="font-ah-symbol text-base/4">c</span>de');
  });

  it('replaces two symbols if needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));
    expect(pipe.transform('ab#cc#de')).toEqual('ab<span class="font-ah-symbol text-base/4">cc</span>de');
  });

  it('doesnt replace symbol if not needed', () => {
    const pipe = new WithAhSymbolsPipe(TestBed.inject(DomSanitizer));
    expect(pipe.transform('abcde')).toEqual('abcde');
  });
});
