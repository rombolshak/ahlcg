import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
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

  protected readonly selectedIndex = signal(0);

  protected onKeyDown($event: KeyboardEvent) {
    $event.preventDefault();
    switch ($event.code) {
      case 'ArrowDown':
      case 'KeyS':
        this.selectedIndex.update((i) => (i + 1) % this.items().length);
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.selectedIndex.update(
          (i) => (i - 1 + this.items().length) % this.items().length,
        );
        break;
      case 'Space':
      case 'Enter':
        this.items()[this.selectedIndex()]?.process();
        break;
    }
  }
}
