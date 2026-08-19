import { ChangeDetectionStrategy, Component, computed, inject, OnInit, viewChild, ViewContainerRef } from '@angular/core';
import { DialogComponent } from '@core/dialog/dialog.component';
import { InputManagerService } from '@core/input-manager.service';
import { SettingsComponent } from '@features/settings/settings.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { testGameState } from '@testing/test-game-state';
import { CardsHandComponent } from './components/cards-hand/cards-hand.component';
import { GameHeaderComponent } from './components/game-header/game-header.component';
import { CurrentInvestigatorPanelComponent } from './current-investigator-panel/current-investigator-panel.component';
import { GlobalGameInfoPanelComponent } from './global-game-info-panel/global-game-info-panel.component';
import { PlayAreaComponent } from './play-area/play-area.component';
import { DebugTimelineService } from './services/debug-timeline.service';
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
    DialogComponent,
    TranslocoDirective,
  ],
  templateUrl: './game-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'h-screen w-screen text-neutral-900 block bg-[url("/assets/images/bg-min.webp")]',
  },
})
export class GameViewComponent implements OnInit {
  protected readonly gameState = inject(GameStateStore);
  protected readonly timelineService = inject(DebugTimelineService);
  private readonly inputManager = inject(InputManagerService);
  protected readonly settingsDialog = viewChild.required<DialogComponent>('settings');

  protected readonly cards = computed(() => {
    return this.gameState.currentInvestigator()?.hand.map(card => this.gameState.getPlayerCard(card)) ?? [];
  });

  private readonly debugPanel = viewChild('debugPanel', {
    read: ViewContainerRef,
  });

  public showDebug = false;

  public ngOnInit() {
    this.inputManager.registerGlobal({
      cancel: () => {
        this.settingsDialog().open();
      },
      toggleDebugPanel: async () => {
        await this.toggleDebug();
      },
      applyPatch: () => {
        this.timelineService.applyNextPatch();
      },
      resetState: () => {
        this.timelineService.restoreOriginalState();
      },
    });
    this.gameState.setState(testGameState);
  }

  public async toggleDebug() {
    this.showDebug = !this.showDebug;
    if (this.showDebug) {
      const { DebugPanelComponent } = await import('./debug-panel/debug-panel.component');

      this.debugPanel()?.createComponent(DebugPanelComponent);
    } else {
      this.debugPanel()?.clear();
    }
  }
}
