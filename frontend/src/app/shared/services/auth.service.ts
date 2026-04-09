import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of } from 'rxjs';

export interface User {
  email: string | null;
  isAnonymous: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _user = new BehaviorSubject<User | undefined>(undefined);

  public constructor() {
    this.refreshCurrentUser();
  }

  public readonly currentUser: Observable<User | undefined> =
    this._user.asObservable();

  public refreshCurrentUser() {
    this.http
      .get<User | undefined>('/api/auth/info')
      .pipe(
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 401) {
            return of(undefined);
          }

          throw err;
        }),
      )
      .subscribe((user) => {
        this._user.next(user);
      });
  }
}
