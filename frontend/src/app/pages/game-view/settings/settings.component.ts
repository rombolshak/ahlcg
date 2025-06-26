import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  provideUserPreferencesService,
  UserPreferences,
} from '../../../shared/services/settings/user-preferences.service';
import { SettingsService } from '../../../shared/services/settings/settings.service';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'ah-settings',
  imports: [TranslocoDirective],
  templateUrl: './settings.component.html',
  styles: ``,
  providers: [provideUserPreferencesService()],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  readonly userPrefs = inject(SettingsService<UserPreferences>);
}
