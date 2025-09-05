import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogService } from 'shared/ui/components/dialog/dialog.service';
import { SvgComponent } from 'shared/ui/components/svg/svg.component';

@Component({
  selector: 'ah-global-game-actions',
  imports: [SvgComponent],
  templateUrl: './global-game-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center justify-end px-8',
  },
})
export class GlobalGameActionsComponent {
  private dialogService = inject(DialogService);

  protected buttons = [
    {
      icon: 'chaosbag',
      tooltip: 'chaosbag',
      isVisible: true,
      handler: () => {
        console.log('chaosbag');
      },
      svgFill: true,
    },
    {
      icon: 'speaker-wave',
      tooltip: 'mute',
      isVisible: true,
      handler: () => {
        console.log('mute');
      },
    },
    {
      icon: 'arrows-out',
      tooltip: 'fullscreen',
      isVisible: true,
      handler: () => {
        console.log('fullscreen');
      },
    },
    {
      icon: 'menu',
      tooltip: 'menu',
      isVisible: true,
      handler: this.openMenu.bind(this),
    },
  ];

  private openMenu() {
    this.dialogService.open('game-menu');
  }
}
