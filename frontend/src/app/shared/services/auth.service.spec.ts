import { TestBed } from '@angular/core/testing';

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
    http.expectOne('/api/auth/info').flush({ isAnonymous: true, email: null, userName: 'anon-guid' });
    service.currentUser.subscribe(data => {
      expect(data).toEqual({ isAnonymous: true, email: null, userName: 'anon-guid' } satisfies User);
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
    http.expectOne('/api/auth/info').flush({ isAnonymous: true, email: null, userName: 'anon-guid' });

    expect(result).toEqual({ isAnonymous: true, email: null, userName: 'anon-guid' } satisfies User);
    service.currentUser.subscribe(data => {
      expect(data).toEqual({ isAnonymous: true, email: null, userName: 'anon-guid' } satisfies User);
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
    http.expectOne('/api/auth/info').flush({ isAnonymous: false, email: 'a@example.com', userName: 'a' });

    expect(result).toEqual({ isAnonymous: false, email: 'a@example.com', userName: 'a' } satisfies User);
  });

  it('should use signIn to upgrade an anonymous session, leaving currentUser permanent', () => {
    http.expectOne('/api/auth/info').flush({ isAnonymous: true, email: null, userName: 'anon-guid' });

    const credentials: Credentials = { email: 'a@example.com', username: 'a', password: 'P@ssw0rd' };
    let result: User | undefined;
    service.signIn(credentials).subscribe(user => {
      result = user;
    });

    http.expectOne('/api/auth/signIn').flush(null);
    http.expectOne('/api/auth/info').flush({ isAnonymous: false, email: 'a@example.com', userName: 'a' });

    expect(result).toEqual({ isAnonymous: false, email: 'a@example.com', userName: 'a' } satisfies User);
  });

  it('should POST to logout, refresh currentUser, and leave currentUser undefined after the following 401', () => {
    http.expectOne('/api/auth/info').flush({ isAnonymous: true, email: null, userName: 'anon-guid' });

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
