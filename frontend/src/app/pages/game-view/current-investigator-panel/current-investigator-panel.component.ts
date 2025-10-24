import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActionsAreaComponent } from '@pages/game-view/current-investigator-panel/actions-area/actions-area.component';
import { GameStateStore } from '../store/game-state.store';
import { ControlAreaComponent } from './control-area/control-area.component';
import { InvestigatorComponent } from './investigator/investigator.component';
import { NoThreatsPhraseService } from './threat-area/no-threats-phrase.service';
import { ThreatAreaComponent } from './threat-area/threat-area.component';
import { ThreatsSeverityService } from './threat-area/threats-severity.service';

@Component({
  selector: 'ah-current-investigator-panel',
  imports: [
    ThreatAreaComponent,
    InvestigatorComponent,
    ControlAreaComponent,
    ActionsAreaComponent,
  ],
  templateUrl: './current-investigator-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-4 overflow-hidden',
  },
})
export class CurrentInvestigatorPanelComponent {
  protected readonly state = inject(GameStateStore);
  private readonly noThreatsPhraseService = inject(NoThreatsPhraseService);
  private readonly threatsSeverityService = inject(ThreatsSeverityService);

  readonly threats = computed(() => {
    const ids = this.state.currentInvestigator()?.threatArea;
    if (!ids) {
      return [];
    }

    return ids.map((i) => this.state.getEnemy(i));
  });

  readonly assets = computed(() => {
    return (
      this.state
        .currentInvestigator()
        ?.controlledAssets.map((a) => this.state.getAsset(a)) ?? []
    );
  });

  readonly noThreatsText = this.noThreatsPhraseService.getPhrase(
    this.state.currentInvestigator,
  );

  private readonly investigatorFullModel = computed(() => {
    const gator = this.state.currentInvestigator();
    if (!gator) return null;
    return {
      ...gator,
      assets: this.assets(),
      threats: this.threats(),
    };
  });

  readonly threatsSeverity = this.threatsSeverityService.getThreatsSeverity(
    this.investigatorFullModel,
  );
}
