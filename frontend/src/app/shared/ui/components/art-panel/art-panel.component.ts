import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ah-art-panel',
  imports: [],
  templateUrl: './art-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col border-1 border-base-content p-4 relative',
  },
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ArtPanelComponent {}
