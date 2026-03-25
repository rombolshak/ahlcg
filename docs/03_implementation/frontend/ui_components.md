# UI Component Patterns

## Purpose
Document frontend component structure, page vs presentational component patterns, and routing/lazy-loading conventions.

## When to Load
Read this when creating or refactoring Angular components and routes.

## Related Files
- [UI Patterns](./ui_patterns.md) — Summary links
- [State Management](./state_management.md)
- [Conventions](../../99_reference/conventions.md)

---

## Page Component (Smart Component)

Located in `pages/{feature}/` with lazy loading.

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GameStateStore } from './store/game-state.store';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-game-view',
  standalone: true,
  imports: [CommonModule, InvestigatorPanel, BoardComponent],
  templateUrl: './game-view.component.html',
})
export class GameViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private gameService = inject(GameService);
  protected gameStore = inject(GameStateStore);

  ngOnInit() {
    const gameId = this.route.snapshot.paramMap.get('id')!;
    this.gameService.getGame(gameId).subscribe(state => {
      this.gameStore.setState(state);
    });
  }
}
```

### Characteristics
- Standalone component (`standalone: true`)
- Injects state and services
- Handles routing parameters
- Delegates rendering to child components
- Minimal styling; prefers layout in top-level containers

---

## Presentational Component (Dumb Component)

Located in `pages/{feature}/panels/` or `shared/ui/`.

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Investigator } from '../../../shared/domain/investigator';

@Component({
  selector: 'app-investigator-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="investigators">
      <h2>Investigators</h2>
      <div *ngFor="let inv of investigators" class="investigator-card">
        <h3>{{ inv.name }}</h3>
        <p>Health: {{ inv.health }}/{{ inv.maxHealth }}</p>
        <p>Sanity: {{ inv.sanity }}/{{ inv.maxSanity }}</p>
        <button (click)="selectInvestigator(inv.id)">Select</button>
      </div>
    </div>
  `,
})
export class InvestigatorPanel {
  @Input() investigators!: Investigator[];
  @Output() investigatorSelected = new EventEmitter<string>();

  selectInvestigator(id: string) {
    this.investigatorSelected.emit(id);
  }
}
```

### Characteristics
- Input/output only
- No direct service calls
- Highly reusable
- Designed for reactivity and pure rendering

---

## Routing & Lazy Loading

Define routes in `app.routes.ts`:

```typescript
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/main-menu/main-menu.component')
      .then(m => m.MainMenuComponent),
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./pages/game-view/game-view.component')
      .then(m => m.GameViewComponent),
    children: [
      {
        path: 'settings',
        loadComponent: () => import('./pages/game-view/settings/settings.component')
          .then(m => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
```

### Navigation API

```typescript
constructor(private router: Router) {}

navigateToGame(gameId: string) {
  this.router.navigate(['/game', gameId]);
}
```

Template:

```html
<a routerLink="/game/123">Play Game 123</a>
```

### Benefits of Lazy Loading
- Reduced initial bundle size
- Faster first paint
- Route isolation for feature modules

