import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
} from '@angular/core';
import Panzoom, { PanzoomObject, PanzoomOptions } from '@panzoom/panzoom';
import { LocationComponent } from './location/location.component';
import { Location } from 'shared/domain/location.model';
import { testLocation } from 'shared/domain/test/test-locations';
import { InvestigatorS } from 'shared/domain/test/test-investigators';
import { InvestigatorWithState } from 'shared/domain/investigator.model';
import { Enemy } from 'shared/domain/enemy.model';
import { testEnemy } from 'shared/domain/test/test-enemies';

@Component({
  selector: 'ah-play-area',
  imports: [LocationComponent],
  template: `
    <div
      #playArea
      class="grid grid-cols-[repeat(9,44rem)] grid-rows-[repeat(9,27rem)] w-max"
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
  enemy: Enemy = testEnemy;
  investigator1 = {
    ...InvestigatorS,
    clues: 2,
    horror: 3,
    damage: 2,
    threatArea: [
      {
        ...this.enemy,
        damage: 1,
        health: 4,
      },
    ],
  };
  investigator2 = {
    ...InvestigatorS,
    clues: 2,
    horror: 4,
    damage: 1,
    threatArea: [],
  };
  investigator3 = {
    ...InvestigatorS,
    clues: 0,
    horror: 1,
    damage: 4,
    threatArea: [
      {
        ...this.enemy,
        damage: 1,
      },
      {
        ...this.enemy,
        damage: 2,
      },
      {
        ...this.enemy,
        damage: 3,
      },
    ],
  };
  investigators: InvestigatorWithState[] = [
    this.investigator3,
    this.investigator2,
    this.investigator1,
  ];

  public ngAfterViewInit() {
    this.zoomArea = Panzoom(this.playArea()?.nativeElement as HTMLElement, {
      contain: 'outside',
      maxScale: 1,
      minScale: 0.2,
    } satisfies PanzoomOptions);

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

    (this.playArea()?.nativeElement as HTMLElement).addEventListener(
      'wheel',
      this.zoomArea.zoomWithWheel,
    );

    console.log(cx, cy);
    setTimeout(() => {
      this.zoomArea.pan(cx, cy, { animate: true });
    }, 10);
  }

  locationWidth = 44 * 16;
  locationHeight = 31 * 16;

  private readonly playArea = viewChild<ElementRef>('playArea');

  private zoomArea!: PanzoomObject;
}
