import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[ah-art-button]',
  imports: [],
  templateUrl: './art-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: `btn border-y-1 border-x-0 [--btn-border:var(--color-base-content)] rounded-none px-[calc(var(--size)/2)] mx-(--size) relative font-normal disabled:bg-[oklch(0.29_0.01_0)] disabled:[--btn-border:#72655d]`,
  },
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ArtButtonComponent {}
