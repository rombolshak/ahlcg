import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ArkErrors, type } from 'arktype';
import { map, Observable } from 'rxjs';

const createdGame = type({ id: 'string.uuid' });
export type CreatedGame = typeof createdGame.infer;

const latestGame = type({ id: 'string.uuid', lastPlayedAt: 'string.date.parse' });
export type LatestGame = typeof latestGame.infer;

const gameSummary = type({
  id: 'string.uuid',
  createdAt: 'string.date.parse',
  lastPlayedAt: 'string.date.parse',
  completedAt: 'string.date.parse | null',
});
export type GameSummary = typeof gameSummary.infer;
const gameSummaries = gameSummary.array();

@Service()
export class GamesService {
  private readonly http = inject(HttpClient);

  public create(configuration: unknown, idempotencyKey: string): Observable<CreatedGame> {
    return this.http.post('/api/games', { configuration }, { headers: { 'Idempotency-Key': idempotencyKey } }).pipe(
      map(response => {
        const game = createdGame(response);
        if (game instanceof ArkErrors) {
          console.error('Invalid game creation response', game.summary);
          return game.throw();
        }

        return game;
      }),
    );
  }

  public latest(): Observable<LatestGame | undefined> {
    return this.http.get<unknown>('/api/games/latest').pipe(
      map(response => {
        if (response === null) return undefined;

        const game = latestGame(response);
        if (game instanceof ArkErrors) {
          console.error('Invalid latest game response', game.summary);
          return game.throw();
        }

        return game;
      }),
    );
  }

  public recent(): Observable<GameSummary[]> {
    return this.fetchGames('/api/games/recent', 'recent games');
  }

  public archive(): Observable<GameSummary[]> {
    return this.fetchGames('/api/games/archive', 'archive games');
  }

  private fetchGames(url: string, label: string): Observable<GameSummary[]> {
    return this.http.get<unknown>(url).pipe(
      map(response => {
        const games = gameSummaries(response);
        if (games instanceof ArkErrors) {
          console.error(`Invalid ${label} response`, games.summary);
          return games.throw();
        }

        return games;
      }),
    );
  }
}
