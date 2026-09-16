import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthService, User } from '@core/auth/auth.service';
import { InputLayer, InputLayerProvider, InputManagerService } from '@core/input-manager.service';
import { GamesService, GameSummary } from '@features/games/games.service';
import { getTranslocoModule } from '@testing/transloco.testing';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CaseFileCardComponent } from './case-file-card/case-file-card.component';
import { CaseFilesComponent } from './case-files.component';

class AuthMockService {
  public readonly _user = new BehaviorSubject<User | undefined>(undefined);
  public readonly currentUser: Observable<User | undefined> = this._user.asObservable();
}

const anonUser: User = { isAnonymous: true, email: null, userName: 'anon-guid' };

const gameSummary = (id: string, lastPlayedAt: string): GameSummary => ({
  id,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  lastPlayedAt: new Date(lastPlayedAt),
});

describe('CaseFilesComponent', () => {
  let component: CaseFilesComponent;
  let fixture: ComponentFixture<CaseFilesComponent>;
  let mockAuthService: AuthMockService;
  let list: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let pushLayer: ReturnType<typeof vi.fn>;
  let destroy: ReturnType<typeof vi.fn>;

  const signIn = () => {
    mockAuthService._user.next(anonUser);
    TestBed.tick();
  };

  const resolveLayer = (): InputLayer => {
    const layer = pushLayer.mock.calls[0]?.[0] as InputLayer | InputLayerProvider;
    return typeof layer === 'function' ? layer() : layer;
  };

  beforeEach(async () => {
    list = vi.fn().mockReturnValue(of([]));
    navigate = vi.fn().mockResolvedValue(true);
    destroy = vi.fn();
    pushLayer = vi.fn().mockReturnValue({ destroy });

    await TestBed.configureTestingModule({
      imports: [CaseFilesComponent, getTranslocoModule()],
      providers: [
        { provide: AuthService, useClass: AuthMockService },
        { provide: GamesService, useValue: { list } },
        { provide: Router, useValue: { navigate } },
        { provide: InputManagerService, useValue: { pushLayer, registerGlobal: vi.fn() } },
      ],
    }).compileComponents();

    mockAuthService = TestBed.inject(AuthService) as unknown as AuthMockService;
    fixture = TestBed.createComponent(CaseFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not fetch games while signed out', () => {
    TestBed.tick();

    expect(list).not.toHaveBeenCalled();
  });

  it('should render one card per game, in the order the service returned', async () => {
    list.mockReturnValue(of([gameSummary('game-1', '2026-01-01T00:00:00Z'), gameSummary('game-2', '2026-02-01T00:00:00Z')]));

    signIn();
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.directive(CaseFileCardComponent));
    expect(cards.map(card => (card.nativeElement as HTMLElement).querySelector('[data-testId]')?.getAttribute('data-testId'))).toEqual(['game-1', 'game-2']);
  });

  it('should navigate to the matching game when a card is clicked', async () => {
    list.mockReturnValue(of([gameSummary('game-1', '2026-01-01T00:00:00Z'), gameSummary('game-2', '2026-02-01T00:00:00Z')]));

    signIn();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.debugElement.query(By.css('[data-testId=game-2]')).nativeElement as HTMLElement).click();

    expect(navigate).toHaveBeenCalledWith(['/game', 'game-2']);
  });

  it('should show the empty state for a user with no games, whose action returns to the main menu', async () => {
    list.mockReturnValue(of([]));

    signIn();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testId=empty]'))).toBeTruthy();

    (fixture.debugElement.query(By.css('[data-testId=begin]')).nativeElement as HTMLElement).click();

    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('should show the loading state before the stream emits', () => {
    list.mockReturnValue(new Subject<GameSummary[]>());

    signIn();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testId=loading]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testId=empty]'))).toBeFalsy();
  });

  it('should show the error state on failure and retry with a second request', async () => {
    list.mockReturnValue(throwError(() => new Error('boom')));

    signIn();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[data-testId=error]'))).toBeTruthy();

    list.mockReturnValue(of([]));
    (fixture.debugElement.query(By.css('[data-testId=retry]')).nativeElement as HTMLElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(list).toHaveBeenCalledTimes(2);
    expect(fixture.debugElement.query(By.css('[data-testId=empty]'))).toBeTruthy();
  });

  it('should destroy the input layer when the component is destroyed', () => {
    expect(pushLayer).toHaveBeenCalledTimes(1);

    fixture.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('should wrap from the last entry back to the first on moveDown', async () => {
    list.mockReturnValue(of([gameSummary('game-1', '2026-01-01T00:00:00Z'), gameSummary('game-2', '2026-02-01T00:00:00Z')]));

    signIn();
    await fixture.whenStable();
    fixture.detectChanges();

    void resolveLayer().moveDown?.();
    void resolveLayer().moveDown?.();
    void resolveLayer().moveDown?.();
    TestBed.tick();
    fixture.detectChanges();

    const activeCard = fixture.debugElement.query(By.css('.active'));
    expect((activeCard.nativeElement as HTMLElement).getAttribute('data-testId')).toBe('game-1');
  });

  it('should select nothing until the user navigates or hovers', async () => {
    list.mockReturnValue(of([gameSummary('game-1', '2026-01-01T00:00:00Z'), gameSummary('game-2', '2026-02-01T00:00:00Z')]));

    signIn();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.active'))).toBeNull();
  });

  it('should clear the selection when the pointer leaves the list', async () => {
    list.mockReturnValue(of([gameSummary('game-1', '2026-01-01T00:00:00Z'), gameSummary('game-2', '2026-02-01T00:00:00Z')]));

    signIn();
    await fixture.whenStable();
    fixture.detectChanges();

    const listElement = fixture.debugElement.query(By.css('[data-testId=list]'));
    fixture.debugElement.queryAll(By.css('ah-case-file-card'))[1]?.triggerEventHandler('mouseenter', {});
    TestBed.tick();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.active'))).not.toBeNull();

    listElement.triggerEventHandler('mouseleave', {});
    TestBed.tick();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.active'))).toBeNull();
  });
});
