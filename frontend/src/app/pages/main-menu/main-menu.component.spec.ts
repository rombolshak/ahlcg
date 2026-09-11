import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthService, User } from '@core/auth/auth.service';
import { AlertDialogService } from '@core/dialog/alert/alert-dialog.service';
import { DialogService } from '@core/dialog/dialog.service';
import { SIGN_IN_DIALOG_OPTIONS, SignInComponent } from '@features/auth/sign-in/sign-in.component';
import { CreatedGame, GamesService } from '@features/games/games.service';
import { getTranslocoModule } from '@testing/transloco.testing';
import { BehaviorSubject, EMPTY, Observable, Subject } from 'rxjs';
import { vi } from 'vitest';
import { MainMenuComponent } from './main-menu.component';

class AuthMockService {
  public readonly _user = new BehaviorSubject<User | undefined>(undefined);
  public readonly currentUser: Observable<User | undefined> = this._user.asObservable();
  public refreshCurrentUser() {
    /* empty */
  }
}

describe('MainMenuComponent', () => {
  let component: MainMenuComponent;
  let fixture: ComponentFixture<MainMenuComponent>;
  let mockAuthService: AuthMockService;
  let openDialog: ReturnType<typeof vi.fn>;
  let createGame: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let alertDialog: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    openDialog = vi.fn().mockReturnValue(EMPTY);
    createGame = vi.fn().mockReturnValue(EMPTY);
    navigate = vi.fn();
    alertDialog = vi.fn().mockReturnValue(EMPTY);

    await TestBed.configureTestingModule({
      imports: [MainMenuComponent, getTranslocoModule()],
      providers: [
        {
          provide: AuthService,
          useClass: AuthMockService,
        },
        {
          provide: DialogService,
          useValue: { open: openDialog },
        },
        {
          provide: GamesService,
          useValue: { create: createGame },
        },
        {
          provide: Router,
          useValue: { navigate },
        },
        {
          provide: AlertDialogService,
          useValue: { alert: alertDialog },
        },
      ],
    }).compileComponents();

    mockAuthService = TestBed.inject(AuthService) as unknown as AuthMockService;
    fixture = TestBed.createComponent(MainMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display login button if not authenticated', () => {
    mockAuthService._user.next(undefined);
    TestBed.tick();

    expect(fixture.debugElement.query(By.css('[data-testId=login_to_continue]'))).toBeTruthy();
  });

  it('should open the sign-in dialog when the login button is pressed', () => {
    mockAuthService._user.next(undefined);
    TestBed.tick();

    (fixture.debugElement.query(By.css('[data-testId=login_to_continue]')).nativeElement as HTMLElement).click();

    expect(openDialog).toHaveBeenCalledWith(SignInComponent, SIGN_IN_DIALOG_OPTIONS);
  });

  it('should display continue button if authenticated', () => {
    mockAuthService._user.next({ isAnonymous: true, email: null, userName: 'anon-guid' });
    TestBed.tick();

    expect(fixture.debugElement.query(By.css('[data-testId=continue]'))).toBeTruthy();
  });

  describe('new game', () => {
    const clickNewGame = () => {
      (fixture.debugElement.query(By.css('[data-testId=new_game]')).nativeElement as HTMLElement).click();
    };

    it('should create a game with a non-empty idempotency key', () => {
      clickNewGame();

      expect(createGame).toHaveBeenCalledTimes(1);
      const [configuration, idempotencyKey] = createGame.mock.calls[0] as [unknown, string];
      expect(configuration).toEqual({});
      expect(idempotencyKey).toBeTruthy();
    });

    it('should disable the item while the request is in flight and ignore a second activation', () => {
      const create$ = new Subject<CreatedGame>();
      createGame.mockReturnValue(create$);

      clickNewGame();
      TestBed.tick();
      clickNewGame();

      const button = fixture.debugElement.query(By.css('[data-testId=new_game]')).nativeElement as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(createGame).toHaveBeenCalledTimes(1);
    });

    const menuButton = (name: string) => fixture.debugElement.query(By.css(`ah-menu-items-list [data-testId=${name}]`)).nativeElement as HTMLButtonElement;

    it('should disable every other menu item while the request is in flight', () => {
      mockAuthService._user.next({ isAnonymous: true, email: null, userName: 'anon-guid' });
      const create$ = new Subject<CreatedGame>();
      createGame.mockReturnValue(create$);
      TestBed.tick();

      clickNewGame();
      TestBed.tick();

      for (const name of ['continue', 'load_game', 'decks', 'settings']) {
        expect(menuButton(name).disabled).toBe(true);
      }
    });

    it('should re-enable the other menu items once the request settles', () => {
      mockAuthService._user.next({ isAnonymous: true, email: null, userName: 'anon-guid' });
      const create$ = new Subject<CreatedGame>();
      createGame.mockReturnValue(create$);
      TestBed.tick();

      clickNewGame();
      create$.error(new Error('boom'));
      TestBed.tick();

      for (const name of ['continue', 'load_game', 'decks', 'settings']) {
        expect(menuButton(name).disabled).toBe(false);
      }
    });

    it('should navigate to the created game on success', () => {
      const create$ = new Subject<CreatedGame>();
      createGame.mockReturnValue(create$);

      clickNewGame();
      create$.next({ id: 'game-1' });
      create$.complete();
      TestBed.tick();

      expect(navigate).toHaveBeenCalledWith(['/game', 'game-1']);
    });

    it('should show an alert and stay on the menu on failure, retrying with the same idempotency key', () => {
      const create$ = new Subject<CreatedGame>();
      createGame.mockReturnValue(create$);

      clickNewGame();
      const [, firstKey] = createGame.mock.calls[0] as [unknown, string];
      create$.error(new Error('boom'));
      TestBed.tick();

      expect(alertDialog).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();

      clickNewGame();
      const [, secondKey] = createGame.mock.calls[1] as [unknown, string];
      expect(secondKey).toBe(firstKey);
    });

    it('should not alert or navigate on a 401, leaving the item activatable again', () => {
      const create$ = new Subject<CreatedGame>();
      createGame.mockReturnValue(create$);

      clickNewGame();
      create$.error(new HttpErrorResponse({ status: 401 }));
      TestBed.tick();

      expect(alertDialog).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();

      const button = fixture.debugElement.query(By.css('[data-testId=new_game]')).nativeElement as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });
});
