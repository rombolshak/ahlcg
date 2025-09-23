import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { CardInfoService } from '../../../../shared/services/card-info.service';
import { DialogService } from '../../../../shared/ui/components/dialog/dialog.service';
import { GameStateStore } from '../../store/game-state.store';
import { CurrentGamePhaseComponent } from './current-game-phase/current-game-phase.component';
import { InvestigatorSeeker } from './current-game-phase/phase-colors.model';
import { ActionButton } from './global-game-actions/action-button.model';
import { GlobalGameActionsComponent } from './global-game-actions/global-game-actions.component';
import { ScenarioNameComponent } from './scenario-name/scenario-name.component';

@Component({
  selector: 'ah-game-header',
  imports: [
    ScenarioNameComponent,
    CurrentGamePhaseComponent,
    GlobalGameActionsComponent,
  ],
  templateUrl: './game-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'grid grid-cols-subgrid text-base-content bg-gradient-to-b from-base-200 via-base-200/80 via-[65%] to-base-200/0',
  },
})
export class GameHeaderComponent {
  private readonly state = inject(GameStateStore).gameState;
  private readonly cardInfoProvider = inject(CardInfoService);
  private dialogService = inject(DialogService);

  protected readonly campaignId = computed(
    () => this.state()?.metaInfo.campaignId ?? '<unknown campaign>',
  );
  protected readonly scenarioId = computed(
    () => this.state()?.metaInfo.scenarioId ?? '<unknown scenario>',
  );

  protected readonly roundNumber = computed(
    () => this.state()?.metaInfo.roundNumber ?? 0,
  );

  protected readonly gamePhase = computed(
    () => this.state()?.metaInfo.gamePhase,
  );

  private readonly currentEntityCard = computed(() => {
    const id = this.state()?.currentInvestigator ?? '';
    if (!id) return undefined;
    return this.state()?.gameEntities[id];
  });

  protected readonly currentEntityInfo = this.cardInfoProvider.getCardInfo(
    this.currentEntityCard,
  );

  protected readonly phaseColor = InvestigatorSeeker;

  protected actions: ActionButton[] = [
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
