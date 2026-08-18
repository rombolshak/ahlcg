import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AuthService } from '@core/auth.service';
import { AH_DIALOG_CONTEXT } from '@core/dialog/dialog-context';
import { SettingsService } from '@core/settings/settings.service';
import { provideUserPreferencesService, UserPreferences } from '@core/settings/user-preferences.service';
import { getTranslocoModule } from '@testing/transloco.testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AccountComponent } from './account/account.component';
import { SettingItemComponent } from './setting-item/setting-item.component';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let closeSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    closeSpy = vi.fn();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, getTranslocoModule({ translocoConfig: { availableLangs: ['en', 'es'], defaultLang: 'en' } })],
      providers: [provideZonelessChangeDetection()],
    })
      .overrideComponent(SettingsComponent, {
        set: {
          providers: [
            provideUserPreferencesService(),
            // `ah-account` is rendered inside the account view, and needs AuthService to construct.
            { provide: AuthService, useValue: { currentUser: of(undefined) } },
            {
              provide: AH_DIALOG_CONTEXT,
              useValue: {
                close: closeSpy,
              },
            },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should change the language with moveLeft/moveRight', async () => {
    const langDisplay = () => (fixture.debugElement.query(By.css('span')).nativeElement as HTMLElement).textContent.trim();

    expect(langDisplay()).toBe('en');

    await component.getInputHandlers().moveRight?.();
    fixture.detectChanges();

    expect(langDisplay()).not.toBe('en');

    await component.getInputHandlers().moveLeft?.();
    fixture.detectChanges();

    expect(langDisplay()).toBe('en');
  });

  it('should apply the selected settings when the buttons row is confirmed', async () => {
    const userPrefs = fixture.debugElement.injector.get<SettingsService<UserPreferences>>(SettingsService<UserPreferences>);

    await component.getInputHandlers().moveRight?.(); // change the drafted language
    await component.getInputHandlers().moveDown?.(); // -> account row
    await component.getInputHandlers().moveDown?.(); // -> buttons row
    await component.getInputHandlers().confirm?.(); // Apply is selected by default

    expect(userPrefs.get()().lang).toBe('es');
    expect(closeSpy).toHaveBeenCalledWith();
  });

  it('should discard the selected settings when the buttons row is confirmed on Discard', async () => {
    const userPrefs = fixture.debugElement.injector.get<SettingsService<UserPreferences>>(SettingsService<UserPreferences>);

    await component.getInputHandlers().moveRight?.();
    await component.getInputHandlers().moveDown?.();
    await component.getInputHandlers().moveDown?.();
    await component.getInputHandlers().moveRight?.(); // switch from Apply to Discard
    await component.getInputHandlers().confirm?.();

    expect(userPrefs.get()().lang).toBe('en');
    expect(closeSpy).toHaveBeenCalledWith();
  });

  it('should discard the drafted settings on cancel, wherever the selection is', async () => {
    const userPrefs = fixture.debugElement.injector.get<SettingsService<UserPreferences>>(SettingsService<UserPreferences>);

    await component.getInputHandlers().moveRight?.();
    await component.getInputHandlers().cancel?.();

    expect(userPrefs.get()().lang).toBe('en');
    expect(closeSpy).toHaveBeenCalledWith();
  });

  it('should highlight the selected setting', () => {
    const setting = fixture.debugElement.query(By.directive(SettingItemComponent));

    expect((setting.nativeElement as HTMLElement).classList).toContain('text-accent-content');
  });

  // The account row and the buttons row both moved the selection on hover; the setting row did
  // not, so a mouse could reach every row but that one.
  it('should move the selection to a setting row on hover', async () => {
    const setting = fixture.debugElement.query(By.directive(SettingItemComponent)).nativeElement as HTMLElement;

    await component.getInputHandlers().moveDown?.(); // -> account row
    fixture.detectChanges();

    expect(setting.classList).not.toContain('text-accent-content');

    setting.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(setting.classList).toContain('text-accent-content');
  });

  it('should open the account view when the account row is confirmed', async () => {
    await component.getInputHandlers().moveDown?.();
    await component.getInputHandlers().confirm?.();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(AccountComponent))).toBeTruthy();
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('should return to the settings view when the account view is left', async () => {
    await component.getInputHandlers().moveDown?.();
    await component.getInputHandlers().confirm?.();
    fixture.detectChanges();

    // In the account view, getInputHandlers delegates wholesale — its own cancel emits `back`.
    await component.getInputHandlers().cancel?.();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.directive(AccountComponent))).toBeFalsy();
    expect(fixture.debugElement.query(By.directive(SettingItemComponent))).toBeTruthy();
  });

  // The account view renames the dialog rather than printing a heading of its own. The dialog asks
  // for the title, so what this owns is the answer — `undefined` leaves the dialog's own in place.
  it('should offer the account title only while the account view is open', async () => {
    expect(component.getTitle()).toBeUndefined();

    await component.getInputHandlers().moveDown?.();
    await component.getInputHandlers().confirm?.();
    fixture.detectChanges(); // `ah-account` must exist before its handlers can be delegated to

    expect(component.getTitle()).toBe('Your Account');

    await component.getInputHandlers().cancel?.();

    expect(component.getTitle()).toBeUndefined();
  });
});
