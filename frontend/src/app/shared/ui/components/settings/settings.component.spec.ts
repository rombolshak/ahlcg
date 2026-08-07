import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { SettingsService } from '@services/settings/settings.service';
import { provideUserPreferencesService, UserPreferences } from '@services/settings/user-preferences.service';
import { AH_DIALOG_CONTEXT } from '@shared/components/dialog/dialog.context';
import { vi } from 'vitest';
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

  it('should apply the selected settings on confirm', async () => {
    const userPrefs = fixture.debugElement.injector.get<SettingsService<UserPreferences>>(SettingsService<UserPreferences>);

    await component.getInputHandlers().moveRight?.();
    await component.getInputHandlers().confirm?.();

    expect(userPrefs.get()().lang).toBe('es');
    expect(closeSpy).toHaveBeenCalledWith();
  });

  it('should discard the selected settings on cancel', async () => {
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
});
