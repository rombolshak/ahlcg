import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { CreateOverlay, ImagesUrlService } from 'services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { InvestigatorModel } from '../../../../models/player-card.model';
import { InvestigatorState } from '../../../../models/investigator.state';

@Component({
  selector: 'ah-investigator',
  imports: [NgOptimizedImage],
  templateUrl: 'investigator.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorComponent {
  protected readonly imagesService = inject(ImagesUrlService);

  baseModel = input.required<InvestigatorModel>();
  investigatorState = input.required<InvestigatorState>();
  protected readonly CreateOverlay = CreateOverlay;
}
