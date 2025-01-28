import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'as',
  standalone: true,
  pure: true,
})
export class AsPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform<T>(value: never, _type: (new (...args: never[]) => T) | T): T {
    return value as T;
  }
}
