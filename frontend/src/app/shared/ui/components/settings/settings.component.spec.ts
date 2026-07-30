import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { provideUserPreferencesService } from '@services/settings/user-preferences.service';
import { AH_DIALOG_CONTEXT } from '@shared/components/dialog/dialog.context';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection()],
    })
      .overrideComponent(SettingsComponent, {
        set: {
          providers: [
            provideUserPreferencesService(),
            {
              provide: AH_DIALOG_CONTEXT,
              useValue: {
                close: () => {
                  /* empty */
                },
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
});
