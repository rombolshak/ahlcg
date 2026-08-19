import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { SIGN_IN_PROMPT } from './sign-in-prompt';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let prompt: ReturnType<typeof vi.fn>;
  let promptResult$: Subject<unknown>;

  beforeEach(() => {
    promptResult$ = new Subject();
    prompt = vi.fn(() => promptResult$);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: SIGN_IN_PROMPT,
          useValue: { prompt },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should open the sign-in prompt and replay the request once it resolves on a 401', () => {
    let result: unknown;
    http.post('/api/games', {}).subscribe(value => {
      result = value;
    });

    httpMock.expectOne('/api/games').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(prompt).toHaveBeenCalledTimes(1);

    promptResult$.next({ isAnonymous: true, email: null, userName: 'anon-guid' });

    httpMock.expectOne('/api/games').flush({ id: '1' });

    expect(result).toEqual({ id: '1' });
  });

  it('should do nothing for a 401 on GET /api/auth/info', () => {
    let error: unknown;
    http.get('/api/auth/info').subscribe({
      error: err => {
        error = err;
      },
    });

    httpMock.expectOne('/api/auth/info').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    expect(prompt).not.toHaveBeenCalled();
  });

  it('should pass through non-401 errors unchanged', () => {
    let error: unknown;
    http.post('/api/games', {}).subscribe({
      error: err => {
        error = err;
      },
    });

    httpMock.expectOne('/api/games').flush(null, { status: 500, statusText: 'Server Error' });

    expect(error).toBeTruthy();
    expect(prompt).not.toHaveBeenCalled();
  });

  it('should rethrow the original 401 when the dialog is dismissed without signing in', () => {
    let error: unknown;
    let completed = false;
    http.post('/api/games', {}).subscribe({
      error: err => {
        error = err;
      },
      complete: () => {
        completed = true;
      },
    });

    httpMock.expectOne('/api/games').flush(null, { status: 401, statusText: 'Unauthorized' });
    promptResult$.complete();

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(401);
    expect(completed).toBe(false);
  });

  it('should rethrow instead of reopening the prompt when the replayed request 401s again', () => {
    let error: unknown;
    http.post('/api/games', {}).subscribe({
      error: err => {
        error = err;
      },
    });

    httpMock.expectOne('/api/games').flush(null, { status: 401, statusText: 'Unauthorized' });
    promptResult$.next({ isAnonymous: true, email: null, userName: 'anon-guid' });

    httpMock.expectOne('/api/games').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
