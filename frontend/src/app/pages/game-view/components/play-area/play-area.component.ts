import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { CardType } from 'models/card-info.model';
import { InvestigatorS } from 'models/test/test-investigators';
import * as pz from 'panzoom';
import { PanZoom } from 'panzoom';
import { LocationComponent } from './location/location.component';
import { Location } from '../../../../models/location.model';

@Component({
  selector: 'ah-play-area',
  imports: [LocationComponent],
  template: ` <div
    class="grid grid-cols-[repeat(9,44rem)] grid-rows-[repeat(9,31rem)]"
    #playArea
  >
    <ah-location
      class="relative col-start-1 row-start-1 rounded"
      [location]="location"
    >
    </ah-location>
  </div>`,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
      // background: rgba(8, 17, 147, 0.6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayAreaComponent implements AfterViewInit {
  location: Location = {
    shroud: 2,
    clues: 3,
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
    setTimeout(() => {
      this.zoomArea = pz.default(this.playArea.nativeElement, {
        maxZoom: 1,
        minZoom: 0.2,
      });
      this.zoomArea.on('transform', (e: PanZoom) => {
        console.log(e.getTransform());
      });

      const parent = this.playArea.nativeElement.parentNode;
      console.log(parent);
      console.log(parent.offsetWidth);
      console.log(parent.offsetHeight);
      const locX = 0;
      const locY = 0;
      const cx =
        -locX * this.locationWidth +
        parent.offsetWidth / 2 -
        this.locationWidth / 2;
      const cy =
        -locY * this.locationHeight +
        parent.offsetHeight / 2 -
        this.locationHeight / 2;
      this.zoomArea.smoothMoveTo(cx, cy);
    }, 10);
  }

  locationWidth = 44 * 16;
  locationHeight = 31 * 16;

  @ViewChild('playArea')
  private readonly playArea!: ElementRef;

  private zoomArea!: PanZoom;
}
