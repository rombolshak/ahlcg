import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

@Component({
  selector: 'ah-svg',
  imports: [],
  templateUrl: './svg.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SvgComponent {
  readonly name = input.required<string>();
  readonly fill = input<string>('none');
  readonly stroke = input<string>('currentcolor');

  protected readonly link = computed(
    () => `/assets/images/svg/${this.name()}.svg#${this.name()}`,
  );
}
