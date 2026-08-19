import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthService, User } from '@core/auth/auth.service';
import { DialogService } from '@core/dialog/dialog.service';
import { SIGN_IN_DIALOG_OPTIONS, SignInComponent } from '@features/auth/sign-in/sign-in.component';
import { getTranslocoModule } from '@testing/transloco.testing';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
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

  beforeEach(async () => {
    openDialog = vi.fn().mockReturnValue(EMPTY);

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
});
