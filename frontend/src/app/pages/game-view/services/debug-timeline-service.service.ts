import { inject, Injectable, signal } from '@angular/core';
import { GameStateStore } from '../store/game-state.store';
import { createPatch, Operation } from 'rfc6902';
import { GameState } from 'shared/domain/game-state';

@Injectable({
  providedIn: 'root',
})
export class DebugTimelineServiceService {
  private readonly store = inject(GameStateStore);
  private originalState = this.store.gameState();
  private lastUpdatedState = this.originalState;
  private patches: Operation[][] = [];

  public readonly totalPatchesRecorded = signal(0);
  public readonly currentAppliedPatch = signal(0);

  recordChanges(newModel: GameState): void {
    const patch = createPatch(this.lastUpdatedState, newModel);
    this.patches.push(patch);
    this.lastUpdatedState = newModel;
    this.totalPatchesRecorded.set(this.patches.length);
  }

  applyNextPatch(): void {
    const nextIndex = this.currentAppliedPatch();
    if (nextIndex < this.patches.length) {
      const patch = this.patches[nextIndex];
      if (patch) {
        this.store.updateState(patch);
        this.currentAppliedPatch.set(nextIndex + 1);
      }
    }
  }

  resetOriginalState(): void {
    this.originalState = this.store.gameState();
    this.lastUpdatedState = this.originalState;
    this.patches = [];
    this.totalPatchesRecorded.set(0);
    this.currentAppliedPatch.set(0);
  }

  restoreOriginalState(): void {
    if (this.originalState) {
      this.store.setState(this.originalState);
    }
  }
}
