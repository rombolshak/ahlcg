import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { ImagesUrlService } from 'services/images-url.service';
import { CardInfo, CardType } from 'models/card-info.model';
import { InvestigatorS } from 'models/test/test-investigators';
import { CardOutlineDirective } from 'directives/card-outline.directive';
import * as pz from 'panzoom';

@Component({
  selector: 'ah-play-area',
  imports: [NgOptimizedImage, CardOutlineDirective],
  template: ` <div
    class="grid grid-cols-[repeat(9,20rem)] grid-rows-9"
    #playArea
  >
    <div class="relative col-start-4 row-start-4 rounded">
      <img
        [ngSrc]="imageService.getIllustration(location.setInfo)"
        width="312"
        height="172"
        class="outline outline-2 outline-stone-200 rounded"
      />

      <div class="flex justify-center flex-wrap">
        <img
          [ngSrc]="imageService.getInvestigator(InvestigatorS.setInfo)"
          width="112"
          height="173"
          ahCardOutline
          class="rounded outline-1 max-w-28"
          [cardClass]="InvestigatorS.class"
        />
        <img
          [ngSrc]="imageService.getInvestigator(InvestigatorS.setInfo)"
          width="112"
          height="173"
          ahCardOutline
          class="rounded outline-1 max-w-28"
          [cardClass]="InvestigatorS.class"
        />
        <img
          [ngSrc]="imageService.getInvestigator(InvestigatorS.setInfo)"
          width="112"
          height="173"
          ahCardOutline
          class="rounded outline-1 max-w-28"
          [cardClass]="InvestigatorS.class"
        />
        <img
          [ngSrc]="imageService.getInvestigator(InvestigatorS.setInfo)"
          width="112"
          height="173"
          ahCardOutline
          class="rounded outline-1 max-w-28"
          [cardClass]="InvestigatorS.class"
        />
      </div>
    </div>

    <div class="relative col-start-6 row-start-4 rounded ">
      <img
        [ngSrc]="imageService.getIllustration(location.setInfo)"
        width="156"
        height="86"
        class="outline outline-2 outline-gray-400"
      />
    </div>
  </div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: rgba(8, 17, 147, 0.6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayAreaComponent implements AfterViewInit {
  imageService = inject(ImagesUrlService);
  location: CardInfo = {
    id: '02126',
    title: 'Вход в музей',
    setInfo: {
      set: '02',
      index: '126',
    },
    cardType: CardType.Location,
    copyright: {
      illustrator: 'Preston Stone',
      ffg: '2016',
    },
  };
  protected readonly InvestigatorS = InvestigatorS;
  protected readonly element = inject(ElementRef);

  public ngAfterViewInit() {
    pz.default(this.playArea.nativeElement);
  }

  @ViewChild('playArea')
  private readonly playArea!: ElementRef;
}
