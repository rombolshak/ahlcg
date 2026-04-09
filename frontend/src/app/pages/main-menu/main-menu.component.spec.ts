import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { AuthService, User } from '@services/auth.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { MainMenuComponent } from './main-menu.component';

class AuthMockService {
  public readonly _user = new BehaviorSubject<User | undefined>(undefined);
  public readonly currentUser: Observable<User | undefined> =
    this._user.asObservable();
  public refreshCurrentUser() {
    /* empty */
  }
}

describe('MainMenuComponent', () => {
  let component: MainMenuComponent;
  let fixture: ComponentFixture<MainMenuComponent>;
  let mockAuthService: AuthMockService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainMenuComponent, getTranslocoModule()],
      providers: [
        {
          provide: AuthService,
          useClass: AuthMockService,
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

    expect(
      fixture.debugElement.query(By.css('[data-testId=login_to_continue]')),
    ).toBeTruthy();
  });

  it('should display continue button if authenticated', () => {
    mockAuthService._user.next({ isAnonymous: true });
    TestBed.tick();

    expect(
      fixture.debugElement.query(By.css('[data-testId=continue]')),
    ).toBeTruthy();
  });
});
