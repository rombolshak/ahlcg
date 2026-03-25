# Frontend State Management

## Purpose
Explains how the frontend manages game state using @ngrx/signals, including reactive updates, RFC6902 patches, and animations.

## When to Load
Read this when modifying the store, adding new state properties, or debugging state-related issues.

## Related Files
- [Frontend Architecture](../../02_architecture/frontend.md) — Overall frontend structure
- [Frontend UI Patterns](./ui_patterns.md) — Component patterns and best practices
- [Architecture Overview](../../02_architecture/overview.md) — How state interacts with server
- [Frontend Testing](../../04_testing/frontend.md) — Testing store updates

---

## Signal Store Overview

Location: `frontend/src/app/pages/game-view/store/game-state.store.ts`

The store uses `@ngrx/signals` to provide reactive, type-safe state management using a wrapper type (`isLoading`, `error`, `gameState`):

```typescript
export const GameStateStore = signalStore(
  { providedIn: 'root' },
  withState<State>({ isLoading: true, error: null, gameState: null }),

  withComputed((store) => ({
    currentInvestigator: computed(() => {
      if (!store.gameState()) return null;
      const id = store.gameState()!.currentInvestigator;
      return store.getInvestigator(id);
    }),
  })),

  withMethods((store) => ({
    setState(state: GameState): void {
      patchState(store, () => ({ isLoading: false, gameState: state }));
    },

    updateState(changes: Operation[]): void {
      const targets = 'ah-investigator-avatar';
      const state = Flip.getState(targets);
      applyStatePatches(store, changes); // includes validateState and patchState on wrapper.gameState
      requestAnimationFrame(() => {
        Flip.from(state, {
          duration: 2,
          targets,
          ease: 'power2.inOut',
        });
      });
    },
  })),
);
```

- `State` shape includes `isLoading`, `error`, `gameState`.
- `setState` updates the wrapper rather than replacing `GameState` directly.
- `updateState` applies RFC6902 patches with `applyStatePatches`, then runs animation.
- `validateState` is invoked from the patch path before persisting.

**Key Concepts:**
- **Signals:** Reactive primitives that notify subscribers of changes
- **Computed:** Memoized derived state (only recalculates when inputs change)
- **patchState:** Updates store immutably
- **RFC6902 Patches:** Standard format for incremental updates
- **Validation:** arktype ensures state shape is always correct

---

## State Shape

See **frontend/src/app/shared/domain/game-state.ts**

---

## Store Methods

### `setState(newState: GameState)`

Replaces entire state. Used on game load:

```typescript
// In game-view.component.ts
ngOnInit() {
  // Load from server or use test data
  const gameState = await this.api.getGameState(gameId);
  this.gameStore.setState(gameState);
}
```

**Flow:**
1. New state passed in
2. Validated against arktype schema
3. If valid, `patchState()` updates store reactively
4. Components subscribed to signals re-render

---

### `updateState(patches: Operation[])`

Applies RFC6902 patches for incremental updates. Used for real-time sync:

```typescript
// In signalr.service.ts
this.connection.on('GameStateUpdated', (patches: Operation[]) => {
  this.gameStore.updateState(patches);
});
```

**Flow:**
1. Receive patches from server (e.g., `[{ op: 'replace', path: '/investigators/0/health', value: 7 }]`)
2. Apply patches to current state copy (`applyPatch()`)
3. Validate result with arktype schema
4. If valid, `patchState()` updates store
5. GSAP Flip animation runs (see below)
6. Components re-render

**Example patches (RFC6902):**

```json
[
  { "op": "replace", "path": "/investigators/0/health", "value": 7 },
  { "op": "add", "path": "/enemies/-", "value": {...} },
  { "op": "remove", "path": "/locations/2" },
  { "op": "move", "path": "/acts/0", "from": "/acts/1" }
]
```

Operations:
- **replace:** Update a value
- **add:** Insert into array or add object property
- **remove:** Delete from array or remove property
- **move:** Reorder array elements
- **copy:** Duplicate a value
- **test:** Verify a value (precondition)

---

## Validation

Uses **arktype** for runtime schema validation:

```typescript
// Usage
const validation = gameState(newState);
if (validation instanceof ArkErrors) {
  console.error('State invalid:', validation);
  throw validation;
}
```

**Benefits:**
- Compile-time: TypeScript checks types
- Runtime: arktype enforces at execution
- Cross-entity: Validates relationships
- Error messages: Descriptive feedback

---

## Animations with GSAP Flip

After state updates, GSAP Flip animates DOM changes:

```typescript
async updateState(patches: Operation[]) {
  // 1. Capture current DOM positions
  const state = Flip.getState('li');  // Record current layout
  
  // 2. Apply patches and update store
  const current = this.store.toJSON();
  const updated = applyPatch(current, patches);
  validateState(updated);
  patchState(this.store, updated);
  // Components re-render with new state
  
  // 3. Wait for Angular to render
  await this.cdr.detectChanges();  // Force sync render
  
  // 4. Animate transitions
  Flip.from(state, {
    duration: 0.6,
    ease: 'power2.inOut',
    absolute: true,
    stagger: 0.05,  // Stagger child animations
  });
}
```

**What Flip does:**
- Records initial positions
- Re-renders DOM based on new state
- Smoothly animates elements from old to new positions
- Feels like a continuous transition

**Example:** Dragging an investigator to a new location:
1. Old: `<li>Roland at Location A</li>` (position: x=100, y=200)
2. New: `<li>Roland at Location B</li>` (position: x=500, y=250)
3. Flip animates: x: 100→500, y: 200→250 over 0.6s

---

## Computed Selectors

Memoized derived state. Only recalculates when inputs change:

```typescript
inv Investig onCount: computed(() => 
  state.investigators().length
)
```

**Usage in components:**

```typescript
export class InvestigatorPanel {
  store = inject(GameStateStore);
  
  investigatorCount = this.store.investigatorCount;  // Signal
  investigators = this.store.investigators;  // Signal
  
  // In template:
  // <p>{{ investigatorCount() }} investigators in play</p>
  // <li *ngFor="let inv of investigators()">{{ inv.name }}</li>
}
```

**Benefits:**
- Efficient: Doesn't recalculate unnecessarily
- Reactive: Automatically updates when dependencies change
- Readable: Clear semantic names for derived data

---

## Component Integration

### Smart Component (Container)

Owns the store connection:

```typescript
@Component({
  selector: 'app-game-view',
  template: `
    <h1>Game: {{ (store.id | async) }}</h1>
    <app-investigator-panel [investigators]="store.investigators()"></app-investigator-panel>
    <app-board [locations]="store.locations()"></app-board>
  `,
})
export class GameViewComponent implements OnInit {
  store = inject(GameStateStore);
  api = inject(ApiService);
  signalr = inject(SignalRService);
  
  ngOnInit() {
    // Load game state on mount
    this.api.getGameState(gameId).subscribe(state => {
      this.store.setState(state);
    });
    
    // Subscribe to real-time updates
    this.signalr.onGameStateUpdated$().subscribe(patches => {
      this.store.updateState(patches);
    });
  }
}
```

### Presentational Component (Dumb)

Receives data via @Input:

```typescript
@Component({
  selector: 'app-investigator-panel',
  template: `
    <div *ngFor="let inv of investigators">
      <h3>{{ inv.name }}</h3>
      <p>Health: {{ inv.health }}</p>
      <button (click)="damageInvestigator(inv.id)">Take Damage</button>
    </div>
  `,
})
export class InvestigatorPanel {
  @Input() investigators: Investigator[] = [];
  @Output() updateInvestigator = new EventEmitter<GameAction>();
  
  damageInvestigator(id: string) {
    this.updateInvestigator.emit({
      type: 'damage_investigator',
      investigatorId: id,
      amount: 1,
    });
  }
}
```

---

## Server Synchronization

**Backend → Frontend (push):**

1. Player makes action on their client
2. Backend validates and applies to canonical state
3. Backend broadcasts patches to all connected clients
4. Frontend SignalR service receives patches
5. Frontend calls `store.updateState(patches)`
6. UI animates to new state

**Frontend → Backend (pull/push):**

1. User clicks button in component
2. Component calls backend API or SignalR method
3. Backend processes action
4. Backend broadcasts patches (or component waits for response)
5. Frontend syncs (see above)

---

## Common Patterns

### Optimistic Updates

Apply change locally immediately, revert if server rejects:

```typescript
// 1. Store old state
const oldState = this.store.toJSON();

// 2. Apply locally (optimistic)
this.store.updateState([
  { op: 'replace', path: '/investigators/0/health', value: 7 }
]);

// 3. Send to server
this.api.updateInvestigatorHealth('inv-1', 7).subscribe({
  next: () => { /* Success, state is correct */ },
  error: () => {
    // Revert on error
    this.store.setState(oldState);
    this.showError('Failed to update');
  }
});
```

### Computed Filters

Filter state reactively:

```typescript
healthyInvestigators = computed(() => 
  this.store.investigators().filter(inv => inv.health > 0)
);

// Usage:
<li *ngFor="let inv of healthyInvestigators()">
  {{ inv.name }}
</li>
```

### Async Operations

Use SignalR methods for async game actions:

```typescript
playCard(cardId: string) {
  this.signalr.connection.invoke('PlayCard', cardId)
    .catch(err => console.error('Play failed:', err));
}
```

---

## Debugging

**In browser console:**

```javascript
// Get store reference
const store = ng.probe(document.querySelector('app-root')).injector.get('GameStateStore');

// View current state
console.log(store.toJSON());

// Watch a signal
store.investigators.subscribe(invs => console.log('Investigators:', invs));

// Manually test patches
const patches = [{ op: 'replace', path: '/investigators/0/health', value: 5 }];
store.updateState(patches);
```

**Chrome DevTools:**

- Angular DevTools extension: Inspect signals in real-time
- Network tab: See WebSocket messages (`/game` hub)
- Console: Look for arktype validation errors

---

## Performance Considerations

- **Signals vs. RxJS:** Signals are synchronous and more efficient
- **Computed:** Only recalculate when inputs change
- **Change Detection:** Zoneless (manual) is faster than default
- **Animations:** GSAP Flip is optimized for performance; disable if slow
- **Large States:** Patch rather than replace entire state when possible

---

## Migration from Old Architecture

If code uses RxJS observables instead of signals:

**Old (RxJS):**
```typescript
state$ = this.store.select(s => s.investigators);
```

**New (Signals):**
```typescript
investigators = this.store.investigators;  // Return signal, not observable
// Template: {{ investigators() }} instead of {{ state$ | async }}
```
