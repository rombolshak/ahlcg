import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { DisplayOptions } from 'shared/domain/display.options';
import { Investigator } from 'shared/domain/entities/investigator.model';
import { CardInfoService } from 'shared/services/card-info.service';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { VitalsBarComponent } from '../../../../shared/ui/components/vitals-bar/vitals-bar.component';
import { InvestigatorAvatarComponent } from '../../components/investigator-avatar/investigator-avatar.component';

@Component({
  selector: 'ah-investigator',
  imports: [
    NgOptimizedImage,
    InvestigatorAvatarComponent,
    TranslocoDirective,
    VitalsBarComponent,
  ],
  templateUrl: './investigator.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigatorComponent {
  readonly investigator = input.required<Investigator>();
  readonly hovered = input<boolean>(false);

  protected readonly imagesService = inject(ImagesUrlService);
  protected displayOptions: DisplayOptions = { cardSize: 's', textSize: 's' };

  private readonly cardInfoService = inject(CardInfoService);
  protected readonly info = this.cardInfoService.getCardInfo(this.investigator);
}
