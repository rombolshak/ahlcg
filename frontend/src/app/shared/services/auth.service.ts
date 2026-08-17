import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, switchMap, tap } from 'rxjs';

export interface User {
  email: string | null;
  userName: string | null;
  isAnonymous: boolean;
}

export interface Credentials {
  email: string;
  username: string;
  password: string;
}

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _user = new BehaviorSubject<User | undefined>(undefined);

  public constructor() {
    this.refreshCurrentUser().subscribe();
  }

  public readonly currentUser: Observable<User | undefined> = this._user.asObservable();

  public loginAnonymously(): Observable<User> {
    return this.http.post('/api/auth/loginAnonymously', {}).pipe(
      switchMap(() => this.refreshCurrentUser()),
      map(user => this.signedIn(user)),
    );
  }

  /**
   * Signs in, registers, or upgrades the current anonymous account — the server picks, based on
   * whether the email is already on record. Callers do not need to know which happened.
   */
  public signIn(credentials: Credentials): Observable<User> {
    return this.http.post('/api/auth/signIn', credentials).pipe(
      switchMap(() => this.refreshCurrentUser()),
      map(user => this.signedIn(user)),
    );
  }

  public logout(): Observable<void> {
    return this.http.post('/api/auth/logout', {}).pipe(
      switchMap(() => this.refreshCurrentUser()),
      map(() => undefined),
    );
  }

  public refreshCurrentUser(): Observable<User | undefined> {
    return this.http.get<User | undefined>('/api/auth/info').pipe(
      catchError(err => {
        if (err instanceof HttpErrorResponse && err.status === 401) {
          return of(undefined);
        }

        throw err;
      }),
      tap(user => {
        this._user.next(user);
      }),
    );
  }

  private signedIn(user: User | undefined): User {
    if (user === undefined) throw new Error('Expected an authenticated user after signing in');
    return user;
  }
}
