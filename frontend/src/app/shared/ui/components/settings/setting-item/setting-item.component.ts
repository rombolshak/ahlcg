import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, TemplateRef } from '@angular/core';

export interface SettingController {
  setNextValue(): void;

  setPreviousValue(): void;
}

@Component({
  selector: 'ah-setting-item',
  imports: [NgTemplateOutlet],
  templateUrl: './setting-item.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'grid grid-cols-2 gap-8 outline-hidden',
    '[class.text-accent-content]': 'selected()',
  },
})
export class SettingItemComponent<T> {
  readonly name = input.required<string>();
  readonly template = input.required<TemplateRef<{ $implicit: T }>>();
  readonly currentValue = input.required<T>();
  readonly selected = input(false);
  readonly nextValue = output();
  readonly prevValue = output();
}
