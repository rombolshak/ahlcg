import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { AuthService } from '@services/auth.service';
import { of } from 'rxjs';
import { MainMenuComponent } from './main-menu.component';

describe('MainMenuComponent', () => {
  let component: MainMenuComponent;
  let fixture: ComponentFixture<MainMenuComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockUser: jasmine.Spy;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj(
      'AuthService',
      [],
      ['currentUser'],
    ) as AuthService;
    await TestBed.configureTestingModule({
      imports: [MainMenuComponent, getTranslocoModule()],
      providers: [
        {
          provide: AuthService,
          useValue: spy,
        },
      ],
    }).compileComponents();

    mockAuthService = TestBed.inject(
      AuthService,
    ) as jasmine.SpyObj<AuthService>;
    mockUser = spyOnProperty(
      mockAuthService,
      'currentUser',
      'get',
    ).and.returnValue(of(undefined));
    fixture = TestBed.createComponent(MainMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display login button if not authenticated', () => {
    mockUser.and.returnValue(of(undefined));
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-testId=login_to_continue]')),
    ).toBeTruthy();
  });

  it('should display continue button if authenticated', () => {
    mockUser.and.returnValue(of({ isAnonymous: true }));
    fixture.detectChanges();

    expect(
      fixture.debugElement.query(By.css('[data-testId=continue]')),
    ).toBeTruthy();
  });
});
