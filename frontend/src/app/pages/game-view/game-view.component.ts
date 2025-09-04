import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  OnInit,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { CurrentInvestigatorPanelComponent } from './current-investigator-panel/current-investigator-panel.component';
import { GlobalGameInfoPanelComponent } from './global-game-info-panel/global-game-info-panel.component';
import { testGameState } from '../../shared/domain/test/test-game-state';
import { GameStateStore } from './store/game-state.store';
import { DebugTimelineService } from './services/debug-timeline.service';
import { SettingsComponent } from './settings/settings.component';
import { CardsHandComponent } from './components/cards-hand/cards-hand.component';
import { PlayAreaComponent } from './play-area/play-area.component';
import { GameHeaderComponent } from './components/game-header/game-header.component';

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
    class: 'h-screen w-screen text-neutral-900',
  },
})
export class GameViewComponent implements OnInit {
  readonly gameState = inject(GameStateStore);
  readonly timelineService = inject(DebugTimelineService);

  readonly cards = computed(() => {
    return (
      this.gameState
        .currentInvestigator()
        ?.hand.map((card) => this.gameState.getPlayerCard(card)) ?? []
    );
  });

  private readonly debugPanel = viewChild('debugPanel', {
    read: ViewContainerRef,
  });

  showDebug = false;

  public ngOnInit() {
    this.gameState.setState(testGameState);
  }

  @HostListener('body:keydown.`')
  async toggleDebug() {
    this.showDebug = !this.showDebug;
    if (this.showDebug) {
      const { DebugPanelComponent } = await import(
        './debug-panel/debug-panel.component'
      );

      this.debugPanel()?.createComponent(DebugPanelComponent);
    } else {
      this.debugPanel()?.clear();
    }
  }

  @HostListener('body:keydown.f10', ['$event'])
  applyNextPatch($event: KeyboardEvent) {
    $event.preventDefault();
    this.timelineService.applyNextPatch();
  }

  @HostListener('body:keydown.f9', ['$event'])
  revertToOriginalState($event: KeyboardEvent) {
    $event.preventDefault();
    this.timelineService.restoreOriginalState();
  }
}
