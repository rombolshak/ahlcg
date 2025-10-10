import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Investigator } from 'shared/domain/entities/investigator.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { VitalsBarComponent } from 'shared/ui/components/vitals-bar/vitals-bar.component';
import { CardOutlineDirective } from 'shared/ui/directives/card-outline.directive';
import { CardFactionBackgroundDirective } from '../../../../shared/ui/directives/card-faction-background.directive';

@Component({
  selector: 'ah-investigator-avatar',
  imports: [
    CardOutlineDirective,
    NgOptimizedImage,
    VitalsBarComponent,
    CardFactionBackgroundDirective,
  ],
  templateUrl: './investigator-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorAvatarComponent {
  readonly investigator = input.required<Investigator>();
  readonly withoutVitals = input<boolean>(false);

  protected readonly imagesService = inject(ImagesUrlService);
}
