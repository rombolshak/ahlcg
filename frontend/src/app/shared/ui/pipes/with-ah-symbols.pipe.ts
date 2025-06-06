import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'withAhSymbols',
  standalone: true,
})
export class WithAhSymbolsPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      value
        .replaceAll(/#(.*?)#/g, `<span class="font-[AHSymbol]">$1</span>`)
        .replaceAll(
          /@(.*?)@/g,
          `<span class="font-[ArnoProBold] italic">$1</span>`,
        ),
    );
  }
}
