import { TestBed } from '@angular/core/testing';

import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthService, User } from './auth.service';

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
    http.expectOne('/api/auth/info').flush(null, { status: 401 });
    service.currentUser.subscribe((data) => {
      expect(data).toBeUndefined();
    });
  });

  it('should load user model', () => {
    http.expectOne('/api/auth/login').flush({ isAnonymous: true, email: null });
    service.currentUser.subscribe((data) => {
      expect(data).toEqual({ isAnonymous: true } satisfies User);
    });
  });
});
