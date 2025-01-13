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
import { PanZoom } from 'panzoom';

@Component({
  selector: 'ah-play-area',
  imports: [NgOptimizedImage, CardOutlineDirective],
  template: ` <div
    class="grid grid-cols-[repeat(9,44rem)] grid-rows-9"
    #playArea
  >
    <div class="relative col-start-4 row-start-4 rounded" #start>
      <img
        [ngSrc]="imageService.getIllustration(location.setInfo)"
        width="690"
        height="420"
        class="outline outline-2 outline-stone-200 rounded"
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
    this.zoomArea = pz.default(this.playArea.nativeElement);
    const rec = this.start.nativeElement.getBoundingClientRect();
    const parentRec =
      this.start.nativeElement.parentNode.parentNode.getBoundingClientRect();
    console.log(rec);
    this.zoomArea.smoothMoveTo(
      -rec.left + rec.width / 4,
      -rec.top + (3 * rec.height) / 4,
    );
  }

  @ViewChild('playArea')
  private readonly playArea!: ElementRef;

  @ViewChild('start')
  private readonly start!: ElementRef;

  private zoomArea!: PanZoom;
}
