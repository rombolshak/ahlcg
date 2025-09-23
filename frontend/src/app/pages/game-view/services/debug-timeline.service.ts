import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { createPatch, Operation } from 'rfc6902';
import { GameState } from 'shared/domain/game-state';
import { GameStateStore } from '../store/game-state.store';

@Injectable({
  providedIn: 'root',
})
export class DebugTimelineService {
  private readonly store = inject(GameStateStore);
  private originalState: GameState | null = null;
  private lastUpdatedState = this.originalState;

  public readonly patches = signal<Operation[][]>([]);
  public readonly totalPatchesRecorded = computed(() => this.patches().length);
  public readonly currentAppliedPatch = signal(0);

  constructor() {
    effect(() => {
      const state = this.store.gameState();
      if (state !== null && this.originalState === null) {
        this.originalState = state;
        this.lastUpdatedState = this.originalState;
      }
    });
  }

  recordChanges(newModel: GameState): void {
    const patch = createPatch(this.lastUpdatedState, newModel);
    if (patch.length === 0) {
      return;
    }
    this.patches.update((p) => [...p, patch]);
    this.lastUpdatedState = newModel;
  }

  applyNextPatch(): void {
    const nextIndex = this.currentAppliedPatch();
    if (nextIndex < this.patches().length) {
      const patch = this.patches()[nextIndex];
      if (patch) {
        this.store.updateState(patch);
        this.currentAppliedPatch.set(nextIndex + 1);
      }
    }
  }

  setOriginalStateFromStore(): void {
    this.originalState = this.store.gameState();
    this.lastUpdatedState = this.originalState;
    this.patches.set([]);
    this.currentAppliedPatch.set(0);
  }

  restoreOriginalState(): void {
    if (this.originalState) {
      this.store.setState(this.originalState);
      this.currentAppliedPatch.set(0);
    }
  }
}
