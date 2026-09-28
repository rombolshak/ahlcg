import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '@testing/transloco.testing';
import { vi } from 'vitest';
import { JoinGameComponent } from './join-game.component';

describe('JoinGameComponent', () => {
  let component: JoinGameComponent;
  let fixture: ComponentFixture<JoinGameComponent>;
  let http: HttpTestingController;

  const codeInput = () => fixture.debugElement.query(By.css('[data-testId=join-game-code]')).nativeElement as HTMLInputElement;
  const submitButton = () => fixture.debugElement.query(By.css('[data-testId=join-game-submit]')).nativeElement as HTMLButtonElement;

  const typeCode = (code: string) => {
    const input = codeInput();
    input.value = code;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const touchField = () => {
    codeInput().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinGameComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(JoinGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable submit while the code is invalid', () => {
    expect(submitButton().disabled).toBe(true);

    typeCode('ABCDEF');

    expect(submitButton().disabled).toBe(false);
  });

  it('should submit a valid code uppercased and emit the joined game id', async () => {
    const emitted: (string | undefined)[] = [];
    component.result.subscribe(id => {
      emitted.push(id);
    });

    typeCode('abcdef');
    submitButton().click();
    await fixture.whenStable();

    const req = http.expectOne('/api/games/join');
    expect(req.request.body).toEqual({ code: 'ABCDEF' });
    req.flush({ id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', createdAt: '2026-01-01', lastPlayedAt: '2026-01-01', configuration: {} });
    await fixture.whenStable();

    expect(emitted).toEqual(['3fa85f64-5717-4562-b3fc-2c963f66afa6']);
  });

  it('should keep the dialog open and show the rejected message on a 404', async () => {
    typeCode('ABCDEF');
    submitButton().click();
    await fixture.whenStable();

    http.expectOne('/api/games/join').flush(null, { status: 404, statusText: 'Not Found' });

    const alert = await vi.waitFor(() => {
      fixture.detectChanges();
      return fixture.debugElement.query(By.css('[data-testId=join-game-error]')).nativeElement as HTMLElement;
    });
    expect(alert.textContent).toContain('Clearance refused');
  });

  it('should show a distinct message on a 429', async () => {
    typeCode('ABCDEF');
    submitButton().click();
    await fixture.whenStable();

    http.expectOne('/api/games/join').flush(null, { status: 429, statusText: 'Too Many Requests' });

    const alert = await vi.waitFor(() => {
      fixture.detectChanges();
      return fixture.debugElement.query(By.css('[data-testId=join-game-error]')).nativeElement as HTMLElement;
    });
    expect(alert.textContent).toContain('Too many attempts');
  });

  it('should stay open with no error and no result on a 401 (a dismissed sign-in prompt)', async () => {
    const emitted: (string | undefined)[] = [];
    component.result.subscribe(id => {
      emitted.push(id);
    });

    typeCode('ABCDEF');
    submitButton().click();
    await fixture.whenStable();

    http.expectOne('/api/games/join').flush(null, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(fixture.debugElement.query(By.css('[data-testId=join-game-error]'))).toBeFalsy();
  });

  it('should refuse a malformed code before sending any request', () => {
    typeCode('K7QO');

    expect(submitButton().disabled).toBe(true);
    http.expectNone('/api/games/join');
  });

  it('should show the format hint once touched and failing the pattern', () => {
    typeCode('K7QO');
    touchField();

    expect(fixture.debugElement.query(By.css('[data-testId=join-game-format-hint]'))).toBeTruthy();
  });

  it('should not show the format hint before the field is touched', () => {
    typeCode('K7QO');

    expect(fixture.debugElement.query(By.css('[data-testId=join-game-format-hint]'))).toBeFalsy();
  });

  it('should emit undefined when dismissed', () => {
    const emitted: (string | undefined)[] = [];
    component.result.subscribe(id => {
      emitted.push(id);
    });

    (fixture.debugElement.query(By.css('[data-testId=join-game-cancel]')).nativeElement as HTMLButtonElement).click();

    expect(emitted).toEqual([undefined]);
  });

  describe('getInputHandlers', () => {
    it('should dismiss on cancel', () => {
      const emitted: (string | undefined)[] = [];
      component.result.subscribe(id => {
        emitted.push(id);
      });

      void component.getInputHandlers().cancel?.();

      expect(emitted).toEqual([undefined]);
    });

    it('should submit through requestSubmit on confirm', async () => {
      typeCode('ABCDEF');

      void component.getInputHandlers().confirm?.();
      await fixture.whenStable();

      http
        .expectOne('/api/games/join')
        .flush({ id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', createdAt: '2026-01-01', lastPlayedAt: '2026-01-01', configuration: {} });
    });
  });

  describe('initialCode', () => {
    it('should submit a valid prefilled code with no interaction', async () => {
      const prefilled = TestBed.createComponent(JoinGameComponent);
      prefilled.componentRef.setInput('initialCode', 'abcdef');
      prefilled.detectChanges();
      await prefilled.whenStable();

      const req = http.expectOne('/api/games/join');
      expect(req.request.body).toEqual({ code: 'ABCDEF' });
      req.flush({ id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', createdAt: '2026-01-01', lastPlayedAt: '2026-01-01', configuration: {} });
    });

    it('should show the format hint and send no request for a malformed prefilled code', async () => {
      const prefilled = TestBed.createComponent(JoinGameComponent);
      prefilled.componentRef.setInput('initialCode', 'K7QO');
      prefilled.detectChanges();
      await prefilled.whenStable();

      expect(prefilled.debugElement.query(By.css('[data-testId=join-game-format-hint]'))).toBeTruthy();
      http.expectNone('/api/games/join');
    });
  });

  it('should reference the legend as the code input label', () => {
    const legend = fixture.debugElement.query(By.css('legend')).nativeElement as HTMLElement;
    expect(codeInput().getAttribute('aria-labelledby')).toBe(legend.id);
  });
});
