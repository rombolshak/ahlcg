import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogService } from 'shared/ui/components/dialog/dialog.service';

@Component({
  selector: 'ah-global-game-actions',
  imports: [],
  templateUrl: './global-game-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center justify-end px-8',
  },
})
export class GlobalGameActionsComponent {
  private dialogService = inject(DialogService);

  protected openMenu() {
    this.dialogService.open('game-menu');
  }
}
