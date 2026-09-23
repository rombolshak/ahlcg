import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, OnInit } from '@angular/core';
import { ScopedTranslocoDirective } from '@core/i18n/scoped-transloco.directive';
import { InputManagerService, LayerRef } from '@core/input-manager.service';
import { listNavigation } from '@core/list-navigation';
import { TitleComponent } from '@pages/main-menu/title/title.component';
import { ArtButtonComponent } from '@ui/kit/art-button/art-button.component';
import { I18N_SCOPE } from '../i18n/scope';
import { MenuItem } from '../menu-item';

@Component({
  selector: 'ah-menu-items-list',
  imports: [ArtButtonComponent, TitleComponent, ScopedTranslocoDirective],
  templateUrl: './menu-items-list.component.html',
  styles: '.active { @apply scale-105 [--btn-color:oklch(0.74_0.14_70)] [--btn-fg:oklch(0.20_0.03_80)] }',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col items-center gap-6 font-[Conkordia]',
  },
})
export class MenuItemsListComponent implements OnInit, OnDestroy {
  private readonly inputManager = inject(InputManagerService);

  protected readonly scope = I18N_SCOPE;

  public readonly items = input.required<MenuItem[]>();

  private inputLayer: LayerRef | undefined;

  private readonly navigation = listNavigation({
    items: this.items,
    onConfirm: item => {
      item.process();
    },
  });
  protected readonly selectedIndex = this.navigation.selectedIndex;

  public ngOnInit() {
    this.inputLayer = this.inputManager.pushLayer(this.navigation.handlers);
  }

  public ngOnDestroy() {
    this.inputLayer?.destroy();
  }
}
