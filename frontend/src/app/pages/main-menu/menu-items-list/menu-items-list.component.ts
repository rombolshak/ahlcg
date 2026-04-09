import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TitleComponent } from '@pages/main-menu/title/title.component';
import { ArtButtonComponent } from '@shared/components/art-button/art-button.component';
import { MenuItem } from '../menu-item';

@Component({
  selector: 'ah-menu-items-list',
  imports: [ArtButtonComponent, TitleComponent, TranslocoDirective],
  templateUrl: './menu-items-list.component.html',
  styles:
    '.active { @apply scale-105 [--btn-color:oklch(0.74_0.14_70)] [--btn-fg:oklch(0.20_0.03_80)] }',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col items-center gap-6 font-[Conkordia]',
    '(body:keydown)': 'onKeyDown($event)',
  },
})
export class MenuItemsListComponent {
  public readonly items = input.required<MenuItem[]>();

  protected readonly selectedIndex = linkedSignal(() => {
    return this.items().findIndex((item) => !item.disabled);
  });

  protected onKeyDown($event: KeyboardEvent) {
    switch ($event.code) {
      case 'ArrowDown':
      case 'KeyS': {
        $event.preventDefault();
        const nextItem = this.items().findIndex(
          (item, index) => index > this.selectedIndex() && !item.disabled,
        );
        if (nextItem !== -1) {
          this.selectedIndex.set(nextItem);
        } else {
          this.selectedIndex.set(
            this.items().findIndex((item) => !item.disabled),
          );
        }
        break;
      }
      case 'ArrowUp':
      case 'KeyW': {
        $event.preventDefault();
        const prevItem = this.items().findLastIndex(
          (item, index) => index < this.selectedIndex() && !item.disabled,
        );
        if (prevItem !== -1) {
          this.selectedIndex.set(prevItem);
        } else {
          this.selectedIndex.set(
            this.items().findLastIndex((item) => !item.disabled),
          );
        }
        break;
      }
      case 'Space':
      case 'Enter': {
        $event.preventDefault();
        this.items()[this.selectedIndex()]?.process();
        break;
      }
    }
  }
}
