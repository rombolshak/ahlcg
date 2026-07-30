import { ChangeDetectionStrategy, Component, inject, input, linkedSignal, OnDestroy, OnInit } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TitleComponent } from '@pages/main-menu/title/title.component';
import { InputManagerService } from '@services/input-manager.service';
import { ArtButtonComponent } from '@shared/components/art-button/art-button.component';
import { MenuItem } from '../menu-item';

@Component({
  selector: 'ah-menu-items-list',
  imports: [ArtButtonComponent, TitleComponent, TranslocoDirective],
  templateUrl: './menu-items-list.component.html',
  styles: '.active { @apply scale-105 [--btn-color:oklch(0.74_0.14_70)] [--btn-fg:oklch(0.20_0.03_80)] }',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col items-center gap-6 font-[Conkordia]',
  },
})
export class MenuItemsListComponent implements OnInit, OnDestroy {
  public readonly items = input.required<MenuItem[]>();

  private readonly inputManager = inject(InputManagerService);

  protected readonly selectedIndex = linkedSignal(() => {
    return this.items().findIndex(item => !item.disabled);
  });

  public ngOnInit() {
    this.inputManager.pushLayer({
      moveDown: () => {
        const nextItem = this.items().findIndex((item, index) => index > this.selectedIndex() && !item.disabled);
        if (nextItem !== -1) {
          this.selectedIndex.set(nextItem);
        } else {
          this.selectedIndex.set(this.items().findIndex(item => !item.disabled));
        }
      },
      moveUp: () => {
        const prevItem = this.items().findLastIndex((item, index) => index < this.selectedIndex() && !item.disabled);
        if (prevItem !== -1) {
          this.selectedIndex.set(prevItem);
        } else {
          this.selectedIndex.set(this.items().findLastIndex(item => !item.disabled));
        }
      },
      confirm: () => {
        this.items()[this.selectedIndex()]?.process();
      },
    });
  }

  public ngOnDestroy() {
    this.inputManager.popLayer();
  }
}
