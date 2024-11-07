import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'as',
  standalone: true,
  pure: true
})
export class AsPipe implements PipeTransform {

  transform<T>(value: any, _type: (new (...args: any[]) => T) | T): T {
    return value as T;
  }

}
