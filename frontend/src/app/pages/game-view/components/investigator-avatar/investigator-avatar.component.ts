import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { CardOutlineDirective } from 'shared/ui/directives/card-outline.directive';
import { NgOptimizedImage } from '@angular/common';
import { VitalsBarComponent } from 'shared/ui/components/vitals-bar/vitals-bar.component';
import { Investigator } from 'shared/domain/investigator.model';
import { ImagesUrlService } from 'shared/services/images-url.service';

@Component({
  selector: 'ah-investigator-avatar',
  imports: [CardOutlineDirective, NgOptimizedImage, VitalsBarComponent],
  templateUrl: './investigator-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorAvatarComponent {
  readonly investigator = input.required<Investigator>();

  protected readonly imagesService = inject(ImagesUrlService);
}
