# UI Testing Patterns

## Purpose
Document component and service test conventions, along with loading/error handling patterns.

## When to Load
Read this when adding or refactoring unit tests in frontend code.

## Related Files
- [UI Patterns](./ui_patterns.md)
- [Testing Strategy](../../04_testing/strategy.md)
- [Conventions](../../99_reference/conventions.md)

---

## Component Unit Test Template

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvestigatorCard } from './investigator-card.component';
import { Investigator } from '../../../shared/domain/investigator';

describe('InvestigatorCard', () => {
  let component: InvestigatorCard;
  let fixture: ComponentFixture<InvestigatorCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorCard],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorCard);
    component = fixture.componentInstance;
  });

  it('should display investigator name', () => {
    const investigator: Investigator = {
      id: 'inv-1',
      name: 'Roland Banks',
      health: 8,
      maxHealth: 8,
      sanity: 8,
      maxSanity: 8,
    };

    component.investigator = investigator;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Roland Banks');
  });

  it('should emit investigatorSelected when clicked', () => {
    spyOn(component.selected, 'emit');
    component.investigator = { id: 'inv-1', name: 'Roland Banks' } as Investigator;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(component.selected.emit).toHaveBeenCalledWith('inv-1');
  });
});
```

---

## Service Test Patterns

Use `HttpClientTestingModule` for HTTP services; mock SignalR or external dependencies.

```typescript
it('should return game state', () => {
  const expected: GameState = { /* ... */ };

  service.getGame('g1').subscribe(result => expect(result).toEqual(expected));

  const req = httpMock.expectOne('/api/game/g1');
  expect(req.request.method).toBe('GET');
  req.flush(expected);
});
```

### Async / Observables

- Use `fakeAsync` + `tick` if time-based
- `waitForAsync` / `async` when using `await` inside Angular test zone
- Use `Marble testing` for complex RxJS streams

---

## Common Patterns

### Loading State

```typescript
loading$ = new BehaviorSubject(false);

loadGame(gameId: string) {
  this.loading$.next(true);
  this.api.getGame(gameId).subscribe({
    next: (state) => this.gameStore.setState(state),
    error: (err) => this.errorMessage = err.message,
    complete: () => this.loading$.next(false),
  });
}
```

Template:

```html
<div *ngIf="loading$ | async" class="spinner"></div>
<div *ngIf="!(loading$ | async)">
  <app-game-board></app-game-board>
</div>
```

### Error Handling

```typescript
getGame(gameId: string): Observable<GameState> {
  return this.http.get<GameState>(`/games/${gameId}`).pipe(
    catchError((err) => {
      console.error('Failed to load game:', err);
      return throwError(() => new Error('Game load failed'));
    }),
  );
}
```

- Prefer strong error type in UI and structure fallback states in component tests
- Use `errors$` BehaviorSubject for display behavior in templates

