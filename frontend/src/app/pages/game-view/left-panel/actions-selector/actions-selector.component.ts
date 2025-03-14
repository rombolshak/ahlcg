import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WithAhSymbolsPipe } from '../../../../shared/ui/pipes/with-ah-symbols.pipe';

@Component({
  selector: 'ah-actions-selector',
  imports: [WithAhSymbolsPipe],
  templateUrl: './actions-selector.component.html',
  host: {
    class: 'flex flex-col',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsSelectorComponent {
  actions = [
    { actionId: 1, title: 'Investigate your location', cost: '#n#' },
    { actionId: 2, title: 'Move to a connecting location', cost: '#n#' },
    { actionId: 3, title: 'Draw 1 card', cost: '#n#' },
    { actionId: 4, title: 'Gain 1 resource', cost: '#n#' },
    { actionId: 5, title: 'Play card from hand', cost: '#n#' },
    { actionId: 6, title: 'Activate ability', cost: '#f#' },
    { actionId: 7, title: 'Fight an enemy', cost: '#f#' },
    { actionId: 8, title: 'Engage an enemy', cost: '#f#' },
    { actionId: 9, title: 'Evade an engaged enemy', cost: '#f#' },
    { actionId: 4, title: 'Gain 1 resource', cost: '#n#' },
    { actionId: 5, title: 'Play card from hand', cost: '#n#' },
    { actionId: 6, title: 'Activate ability', cost: '#f#' },
    { actionId: 7, title: 'Fight an enemy', cost: '#f#' },
    { actionId: 8, title: 'Engage an enemy', cost: '#f#' },
    { actionId: 9, title: 'Evade an engaged enemy', cost: '#f#' },
    { actionId: 9, title: 'Evade an engaged enemy', cost: '#f#' },
    { actionId: 9, title: 'Evade an engaged enemy', cost: '#f#' },
  ];
}
