import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'trimStart',
  standalone: true
})
export class TrimStartPipe implements PipeTransform {

  transform(value: string, ...args: string[]): string {
    const search = args.join('|');
    return value.replaceAll(new RegExp(`^${search}*`, 'g'), '');
  }

}
