# UI Service Patterns

## Purpose
Document shared service patterns for HTTP, SignalR, and singleton application services.

## When to Load
Read this when implementing new services or integrating backend API interactions.

## Related Files
- [UI Patterns](./ui_patterns.md)
- [Component Patterns](./ui_components.md)
- [State Management](./state_management.md)
- [Conventions](../../99_reference/conventions.md)

---

## Service Location

- `frontend/src/app/shared/services/` for cross-feature services
- `frontend/src/app/pages/{feature}/services/` for feature-local variants

### HTTP Service

**Conventions**
- Strongly typed request/response DTOs
- Use Angular `HttpClient` with `Observable` return values
- Keep to API contract and avoid domain logic inside service
- Catch errors and rethrow as user-friendly messages

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = '/api';

  constructor(private http: HttpClient) {}

  getGame(gameId: string): Observable<GameState> {
    return this.http.get<GameState>(`${this.base}/game/${gameId}`)
      .pipe(catchError(err => throwError(() => new Error('Game load failed'))));
  }
}
```

### SignalR Service

**Conventions**
- Singleton `providedIn: 'root'`
- Single `HubConnection` instance
- Expose events as `Observable`
- Use automatic reconnects
- Include fallback or manual reconnect helper

```typescript
@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hub = new HubConnectionBuilder()
    .withUrl('/game', { withCredentials: true })
    .withAutomaticReconnect()
    .build();

  private gameStateSubject = new BehaviorSubject<JsonPatch[]>([]);
  gameState$ = this.gameStateSubject.asObservable();

  async connect() {
    await this.hub.start();
    this.hub.on('OnGameStateChanged', patch => this.gameStateSubject.next(patch));
  }

  async ping() {
    return this.hub.invoke('Ping');
  }
}
```

---

## Error Handling Pattern

**Fail-fast on HTTP errors**

```typescript
return this.http.get<MyDto>(url).pipe(
  retry(1),
  catchError((error: HttpErrorResponse) => {
    const message = error.error?.message ?? 'Unexpected API error';
    return throwError(() => new Error(message));
  }),
);
```

**Fallback logic for SignalR**

- Track `onreconnecting`, `onreconnected`, `onclose`
- Show status in UI
- Provide manual reconnect button

---

## Dependency Injection

- Prefers constructor injection for testability
- Avoid non-injectable service singletons
- Use `InjectionToken` for configuration values

```typescript
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

providers: [
  { provide: API_BASE_URL, useValue: 'https://localhost:5001' },
]
```

---

## Service Testing

- Use `HttpClientTestingModule` for HTTP services
- Use `spyOn` and fake observables for SignalR service methods
- Keep assertions on observable inputs/outputs, not internals

```typescript
it('should return game state', () => {
  const expected: GameState = { ... };
  service.getGame('g1').subscribe(result => expect(result).toEqual(expected));
  const req = httpMock.expectOne('/api/game/g1');
  req.flush(expected);
});
```

