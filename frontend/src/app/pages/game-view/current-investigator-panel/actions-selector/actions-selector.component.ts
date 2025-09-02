import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WithAhSymbolsPipe } from 'shared/ui/pipes/with-ah-symbols.pipe';
import { Actions } from 'shared/domain/action.model';

@Component({
  selector: 'ah-actions-selector',
  imports: [WithAhSymbolsPipe],
  templateUrl: './actions-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col',
  },
})
export class ActionsSelectorComponent {
  readonly actions = input.required<Actions>();
}
