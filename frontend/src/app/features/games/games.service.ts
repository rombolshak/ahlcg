import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { ArkErrors, type } from 'arktype';
import { map, Observable } from 'rxjs';

const createdGame = type({ id: 'string.uuid' });
export type CreatedGame = typeof createdGame.infer;

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
}
