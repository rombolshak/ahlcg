import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
} from '@angular/core';
import * as pz from 'panzoom';
import { PanZoom } from 'panzoom';
import { LocationComponent } from './location/location.component';
import { Location } from 'shared/domain/location.model';
import { testLocation } from 'shared/domain/test/test-locations';
import { InvestigatorS } from 'shared/domain/test/test-investigators';
import { InvestigatorWithState } from 'shared/domain/player-card.model';

@Component({
  selector: 'ah-play-area',
  imports: [LocationComponent],
  template: `
    <div
      #playArea
      class="grid grid-cols-[repeat(9,44rem)] grid-rows-[repeat(9,31rem)]"
    >
      <ah-location
        class="relative col-start-1 row-start-1 rounded"
        [location]="location"
        [investigators]="investigators"
      />
    </div>
  `,
  // eslint-disable-next-line @angular-eslint/component-max-inline-declarations
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayAreaComponent implements AfterViewInit {
  location: Location = testLocation;
  investigator1 = {
    ...InvestigatorS,
    clues: 2,
    horror: 3,
    damage: 2,
  };
  investigators: InvestigatorWithState[] = [
    this.investigator1,
    this.investigator1,
  ];

  public ngAfterViewInit() {
    setTimeout(() => {
      this.zoomArea = pz.default(
        this.playArea()?.nativeElement as HTMLElement,
        {
          maxZoom: 1,
          minZoom: 0.2,
        },
      );

      const parent = (this.playArea()?.nativeElement as HTMLElement)
        .parentNode as HTMLElement;
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

  private readonly playArea = viewChild<ElementRef>('playArea');

  private zoomArea!: PanZoom;
}
