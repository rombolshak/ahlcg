import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GamesService } from './games.service';

describe('GamesService', () => {
  let service: GamesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(GamesService);
  });

  it('should POST the configuration with an Idempotency-Key header', () => {
    service.create({ scenario: 'the-gathering' }, 'a-key').subscribe();

    const req = http.expectOne('/api/games');
    expect(req.request.body).toEqual({ configuration: { scenario: 'the-gathering' } });
    expect(req.request.headers.get('Idempotency-Key')).toBe('a-key');

    req.flush({ id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', createdAt: '2026-01-01', lastPlayedAt: '2026-01-01', configuration: {} });
  });

  it('should map a GameDto response to its id', () => {
    let result: { id: string } | undefined;
    service.create({}, 'a-key').subscribe(game => {
      result = game;
    });

    http.expectOne('/api/games').flush({ id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', createdAt: '2026-01-01', lastPlayedAt: '2026-01-01', configuration: {} });

    expect(result?.id).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
  });

  it('should throw when the response id is not a uuid', () => {
    let error: unknown;
    service.create({}, 'a-key').subscribe({
      error: err => {
        error = err;
      },
    });

    http.expectOne('/api/games').flush({ id: 'not-a-uuid' });

    expect(error).toBeTruthy();
  });

  it('should GET /api/games/latest and map the body to an id and a lastPlayedAt date', () => {
    let result: { id: string; lastPlayedAt: Date } | undefined;
    service.latest().subscribe(game => {
      result = game;
    });

    const req = http.expectOne('/api/games/latest');
    req.flush({ id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', lastPlayedAt: '2026-01-01T00:00:00+00:00' });

    expect(result?.id).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
    expect(result?.lastPlayedAt).toEqual(new Date('2026-01-01T00:00:00+00:00'));
  });

  it('should map a 204 to undefined', () => {
    let result: { id: string; lastPlayedAt: Date } | undefined = { id: 'placeholder', lastPlayedAt: new Date() };
    service.latest().subscribe(game => {
      result = game;
    });

    http.expectOne('/api/games/latest').flush(null, { status: 204, statusText: 'No Content' });

    expect(result).toBeUndefined();
  });

  it('should throw when the response is malformed', () => {
    let error: unknown;
    service.latest().subscribe({
      error: err => {
        error = err;
      },
    });

    http.expectOne('/api/games/latest').flush({ id: 'not-a-uuid' });

    expect(error).toBeTruthy();
  });

  it('should GET /api/games/recent and map the body to a list of ids and dates', () => {
    let result: { id: string; createdAt: Date; lastPlayedAt: Date }[] | undefined;
    service.recent().subscribe(games => {
      result = games;
    });

    const req = http.expectOne('/api/games/recent');
    req.flush([
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        createdAt: '2026-01-01T00:00:00+00:00',
        lastPlayedAt: '2026-01-02T00:00:00+00:00',
        completedAt: null,
        configuration: {},
      },
    ]);

    expect(result?.[0]?.id).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
    expect(result?.[0]?.createdAt).toEqual(new Date('2026-01-01T00:00:00+00:00'));
    expect(result?.[0]?.lastPlayedAt).toEqual(new Date('2026-01-02T00:00:00+00:00'));
  });

  it('should throw when the recent games response is malformed', () => {
    let error: unknown;
    service.recent().subscribe({
      error: err => {
        error = err;
      },
    });

    http.expectOne('/api/games/recent').flush([{ id: 'not-a-uuid' }]);

    expect(error).toBeTruthy();
  });

  it('should GET /api/games/archive and map the body to a list of ids and dates', () => {
    let result: { id: string; createdAt: Date; lastPlayedAt: Date }[] | undefined;
    service.archive().subscribe(games => {
      result = games;
    });

    const req = http.expectOne('/api/games/archive');
    req.flush([
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        createdAt: '2026-01-01T00:00:00+00:00',
        lastPlayedAt: '2026-01-02T00:00:00+00:00',
        completedAt: '2026-01-03T00:00:00+00:00',
        configuration: {},
      },
    ]);

    expect(result?.[0]?.id).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
    expect(result?.[0]?.createdAt).toEqual(new Date('2026-01-01T00:00:00+00:00'));
    expect(result?.[0]?.lastPlayedAt).toEqual(new Date('2026-01-02T00:00:00+00:00'));
  });

  it('should throw when the archive games response is malformed', () => {
    let error: unknown;
    service.archive().subscribe({
      error: err => {
        error = err;
      },
    });

    http.expectOne('/api/games/archive').flush([{ id: 'not-a-uuid' }]);

    expect(error).toBeTruthy();
  });

  it('should map completedAt to null or to a date depending on the response', () => {
    let result: { completedAt: Date | null }[] | undefined;
    service.recent().subscribe(games => {
      result = games;
    });

    http.expectOne('/api/games/recent').flush([
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        createdAt: '2026-01-01T00:00:00+00:00',
        lastPlayedAt: '2026-01-02T00:00:00+00:00',
        completedAt: null,
        configuration: {},
      },
      {
        id: '4fa85f64-5717-4562-b3fc-2c963f66afa7',
        createdAt: '2026-01-01T00:00:00+00:00',
        lastPlayedAt: '2026-01-02T00:00:00+00:00',
        completedAt: '2026-01-05T00:00:00+00:00',
        configuration: {},
      },
    ]);

    expect(result?.[0]?.completedAt).toBeNull();
    expect(result?.[1]?.completedAt).toEqual(new Date('2026-01-05T00:00:00+00:00'));
  });
});
