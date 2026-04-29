import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { testGameState } from '@domain/test/test-game-state';
import { CardsHandComponent } from './components/cards-hand/cards-hand.component';
import { GameHeaderComponent } from './components/game-header/game-header.component';
import { CurrentInvestigatorPanelComponent } from './current-investigator-panel/current-investigator-panel.component';
import { GlobalGameInfoPanelComponent } from './global-game-info-panel/global-game-info-panel.component';
import { PlayAreaComponent } from './play-area/play-area.component';
import { DebugTimelineService } from './services/debug-timeline.service';
import { SettingsComponent } from '@shared/components/settings/settings.component';
import { GameStateStore } from './store/game-state.store';

@Component({
  selector: 'ah-game-view',
  imports: [
    CurrentInvestigatorPanelComponent,
    GlobalGameInfoPanelComponent,
    SettingsComponent,
    CardsHandComponent,
    PlayAreaComponent,
    GameHeaderComponent,
  ],
  templateUrl: './game-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'h-screen w-screen text-neutral-900 block bg-[url("/assets/images/bg-min.webp")]',
    '(body:keydown.`)': 'toggleDebug()',
    '(body:keydown.f10)': 'applyNextPatch($event)',
    '(body:keydown.f9)': 'revertToOriginalState($event)',
    '(body:keydown.esc)': 'openMenu($event)'
  },
})
export class GameViewComponent implements OnInit {
  protected readonly gameState = inject(GameStateStore);
  protected readonly timelineService = inject(DebugTimelineService);
  protected readonly settingsDialog = viewChild.required<SettingsComponent>('settings')

  protected readonly cards = computed(() => {
    return (
      this.gameState
        .currentInvestigator()
        ?.hand.map((card) => this.gameState.getPlayerCard(card)) ?? []
    );
  });

  private readonly debugPanel = viewChild('debugPanel', {
    read: ViewContainerRef,
  });

  public showDebug = false;

  public ngOnInit() {
    this.gameState.setState(testGameState);
  }

  public async toggleDebug() {
    this.showDebug = !this.showDebug;
    if (this.showDebug) {
      const { DebugPanelComponent } =
        await import('./debug-panel/debug-panel.component');

      this.debugPanel()?.createComponent(DebugPanelComponent);
    } else {
      this.debugPanel()?.clear();
    }
  }

  protected applyNextPatch($event: Event) {
    $event.preventDefault();
    this.timelineService.applyNextPatch();
  }

  protected revertToOriginalState($event: Event) {
    $event.preventDefault();
    this.timelineService.restoreOriginalState();
  }

  protected openMenu($event: Event) {
    $event.preventDefault();
    this.settingsDialog().openSettings();
  }
}
