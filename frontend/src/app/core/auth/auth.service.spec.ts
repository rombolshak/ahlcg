import { TestBed } from '@angular/core/testing';

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TraversalError } from 'arktype';
import { AuthService, Credentials, User } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
  });

  it('should load status on creation', () => {
    expect(service).toBeTruthy();
    http.expectOne('/api/auth/info').flush(null, { status: 401, statusText: 'Not Authorized' });
    service.currentUser.subscribe(data => {
      expect(data).toBeUndefined();
    });
  });

  it('should load user model', () => {
    http.expectOne('/api/auth/info').flush({ userId: 'account-id', isAnonymous: true, email: null, userName: 'anon-guid' });
    service.currentUser.subscribe(data => {
      expect(data).toEqual({ userId: 'account-id', isAnonymous: true, email: null, userName: 'anon-guid' } satisfies User);
    });
  });

  it('should not issue any request until subscribed', () => {
    http.expectOne('/api/auth/info').flush(null, { status: 401, statusText: 'Not Authorized' });

    service.loginAnonymously();

    http.expectNone('/api/auth/loginAnonymously');
  });

  it('should POST to loginAnonymously and refresh currentUser', () => {
    http.expectOne('/api/auth/info').flush(null, { status: 401, statusText: 'Not Authorized' });

    let result: User | undefined;
    service.loginAnonymously().subscribe(user => {
      result = user;
    });

    http.expectOne('/api/auth/loginAnonymously').flush(null);
    http.expectOne('/api/auth/info').flush({ userId: 'account-id', isAnonymous: true, email: null, userName: 'anon-guid' });

    expect(result).toEqual({ userId: 'account-id', isAnonymous: true, email: null, userName: 'anon-guid' } satisfies User);
    service.currentUser.subscribe(data => {
      expect(data).toEqual({ userId: 'account-id', isAnonymous: true, email: null, userName: 'anon-guid' } satisfies User);
    });
  });

  it('should POST credentials to signIn and refresh currentUser', () => {
    http.expectOne('/api/auth/info').flush(null, { status: 401, statusText: 'Not Authorized' });

    const credentials: Credentials = { email: 'a@example.com', username: 'a', password: 'P@ssw0rd' };
    let result: User | undefined;
    service.signIn(credentials).subscribe(user => {
      result = user;
    });

    const req = http.expectOne('/api/auth/signIn');

    expect(req.request.body).toEqual(credentials);
    req.flush(null);
    http.expectOne('/api/auth/info').flush({ userId: 'account-id', isAnonymous: false, email: 'a@example.com', userName: 'a' });

    expect(result).toEqual({ userId: 'account-id', isAnonymous: false, email: 'a@example.com', userName: 'a' } satisfies User);
  });

  it('should use signIn to upgrade an anonymous session, leaving currentUser permanent', () => {
    http.expectOne('/api/auth/info').flush({ userId: 'account-id', isAnonymous: true, email: null, userName: 'anon-guid' });

    const users: (User | undefined)[] = [];
    service.currentUser.subscribe(user => users.push(user));

    const credentials: Credentials = { email: 'a@example.com', username: 'a', password: 'P@ssw0rd' };
    let result: User | undefined;
    service.signIn(credentials).subscribe(user => {
      result = user;
    });

    http.expectOne('/api/auth/signIn').flush(null);
    http.expectOne('/api/auth/info').flush({ userId: 'account-id', isAnonymous: false, email: 'a@example.com', userName: 'a' });

    expect(result).toEqual({ userId: 'account-id', isAnonymous: false, email: 'a@example.com', userName: 'a' } satisfies User);
    expect(users.map(user => user?.userId)).toEqual(['account-id', 'account-id']);
    expect(users.at(-1)).toEqual(result);
  });

  it('should adopt the server identity when signing into a different account', () => {
    http.expectOne('/api/auth/info').flush({ userId: 'anonymous-id', isAnonymous: true, email: null, userName: null });
    const users: (User | undefined)[] = [];
    service.currentUser.subscribe(user => users.push(user));

    service.signIn({ email: 'a@example.com', username: 'a', password: 'P@ssw0rd' }).subscribe();
    http.expectOne('/api/auth/signIn').flush(null);
    const permanent = { userId: 'different-id', isAnonymous: false, email: 'a@example.com', userName: 'a' };
    http.expectOne('/api/auth/info').flush(permanent);

    expect(users.map(user => user?.userId)).toEqual(['anonymous-id', 'different-id']);
  });

  it.each([
    { isAnonymous: true, email: null, userName: null },
    { userId: null, isAnonymous: true, email: null, userName: null },
    { userId: 123, isAnonymous: true, email: null, userName: null },
    { userId: 'opaque', isAnonymous: 'yes', email: null, userName: null },
    { userId: 'opaque', isAnonymous: true, email: 123, userName: null },
    { userId: 'opaque', isAnonymous: true, email: null, userName: 123 },
  ])('should reject malformed auth info without publishing it: %j', response => {
    const validUser: User = { userId: 'retained-id', isAnonymous: true, email: null, userName: null };
    http.expectOne('/api/auth/info').flush(validUser);
    const users: (User | undefined)[] = [];
    service.currentUser.subscribe(user => users.push(user));
    let error: unknown;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    service.refreshCurrentUser().subscribe({
      error: err => {
        error = err;
      },
    });
    http.expectOne('/api/auth/info').flush(response);

    expect(error).toBeInstanceOf(TraversalError);
    expect(users).toEqual([validUser]);
    consoleError.mockRestore();
  });

  it('should clear an existing identity when auth info returns 401', () => {
    http.expectOne('/api/auth/info').flush({ userId: 'opaque', isAnonymous: false, email: null, userName: null });
    const users: (User | undefined)[] = [];
    service.currentUser.subscribe(user => users.push(user));

    service.refreshCurrentUser().subscribe();
    http.expectOne('/api/auth/info').flush(null, { status: 401, statusText: 'Not Authorized' });

    expect(users.map(user => user?.userId)).toEqual(['opaque', undefined]);
  });

  it('should POST to logout, refresh currentUser, and leave currentUser undefined after the following 401', () => {
    http.expectOne('/api/auth/info').flush({ userId: 'account-id', isAnonymous: true, email: null, userName: 'anon-guid' });

    let emitted = false;
    service.logout().subscribe(value => {
      emitted = true;

      expect(value).toBeUndefined();
    });

    http.expectOne('/api/auth/logout').flush(null);
    http.expectOne('/api/auth/info').flush(null, { status: 401, statusText: 'Not Authorized' });

    expect(emitted).toBe(true);
    service.currentUser.subscribe(data => {
      expect(data).toBeUndefined();
    });
  });
});
