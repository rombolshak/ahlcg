import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[ah-art-button]',
  imports: [],
  templateUrl: './art-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: `btn border-base-content border-y-1 border-x-0 rounded-none px-[calc(var(--size)/2)] mx-(--size) relative`,
  },
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ArtButtonComponent {}
