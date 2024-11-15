import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'withAhSymbols',
  standalone: true,
})
export class WithAhSymbolsPipe implements PipeTransform {
  constructor(private readonly sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      value.replaceAll(/#(.*?)#/g, `<span class='font-ah-symbol'>$1</span>`),
    );
  }
}
