import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  OnInit,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { LeftPanelComponent } from './left-panel/left-panel.component';
import { CentralViewComponent } from './central-view/central-view.component';
import { RightPanelComponent } from './right-panel/right-panel.component';
import { testGameState } from '../../shared/domain/test/test-game-state';
import { GameStateStore } from './store/game-state.store';
import { DebugTimelineService } from './services/debug-timeline.service';
import { SettingsComponent } from './settings/settings.component';

@Component({
  selector: 'ah-game-view',
  imports: [
    LeftPanelComponent,
    CentralViewComponent,
    RightPanelComponent,
    SettingsComponent,
  ],
  templateUrl: './game-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex gap-4 p-8 h-screen w-screen relative text-neutral-900',
  },
})
export class GameViewComponent implements OnInit {
  readonly gameState = inject(GameStateStore);
  readonly timelineService = inject(DebugTimelineService);

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
