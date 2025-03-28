import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  viewChild,
} from '@angular/core';
import Panzoom, { PanzoomObject, PanzoomOptions } from '@panzoom/panzoom';
import { LocationComponent } from './location/location.component';
import { Location } from 'shared/domain/location.model';
import {
  testLocation,
  testLocation2,
  testLocation3,
} from 'shared/domain/test/test-locations';
import { InvestigatorS } from 'shared/domain/test/test-investigators';
import { Investigator } from 'shared/domain/investigator.model';
import { Enemy } from 'shared/domain/enemy.model';
import { testEnemy } from 'shared/domain/test/test-enemies';
import { LocationsConnectionComponent } from './locations-connection/locations-connection.component';

@Component({
  selector: 'ah-play-area',
  imports: [LocationComponent, LocationsConnectionComponent],
  templateUrl: './play-area.component.html',
  host: {
    class: 'block w-full h-full overflow-hidden',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayAreaComponent implements AfterViewInit {
  location: Location = testLocation;

  enemy: Enemy = testEnemy;
  investigator1: Investigator = {
    ...InvestigatorS,
    tokens: {
      clue: 2,
    },
    sanity: {
      max: InvestigatorS.sanity.max,
      damaged: 3,
    },
    health: {
      max: InvestigatorS.health.max,
      damaged: 2,
    },
    threatArea: [
      {
        ...this.enemy,
        health: {
          max: 4,
          damaged: 1,
        },
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
  investigators: Investigator[] = [
    this.investigator3,
    this.investigator2,
    this.investigator1,
  ];

  worldMap = {
    width: 6,
    height: 6,
    locations: [
      {
        x: 2,
        y: 3,
        location: { ...testLocation, id: 1 } satisfies Location,
        investigators: this.investigators,
      },
      {
        x: 4,
        y: 2,
        location: { ...testLocation2, id: 2 },
        investigators: [],
      },
      {
        x: 4,
        y: 4,
        location: { ...testLocation3, id: 3 },
        investigators: [],
      },
    ],
    connections: [
      { from: 1, to: 2 },
      { from: 1, to: 3 },
    ],
  };

  protected readonly connectionColors = computed(() => {
    return this.worldMap.connections.map((conn) => {
      return {
        fromColor: this.worldMap.locations.find(
          (l) => l.location.id === conn.from,
        )?.location.color,
        toColor: this.worldMap.locations.find((l) => l.location.id === conn.to)
          ?.location.color,
      };
    });
  });

  public ngAfterViewInit() {
    this.zoomArea = Panzoom(this.playArea()?.nativeElement as HTMLElement, {
      contain: 'outside',
      maxScale: 1,
      minScale: 0.2,
    } satisfies PanzoomOptions);

    const parent = (this.playArea()?.nativeElement as HTMLElement)
      .parentNode as HTMLElement;
    const locX = 1;
    const locY = 2;
    const cx =
      -locX * (this.locationWidth - this.gapWidth / 2) +
      parent.offsetWidth / 2 -
      this.locationWidth / 2;
    const cy =
      -locY * (this.locationHeight - this.gapHeight) +
      parent.offsetHeight / 2 -
      this.locationHeight / 2;

    (this.playArea()?.nativeElement as HTMLElement).addEventListener(
      'wheel',
      this.zoomArea.zoomWithWheel,
    );

    console.log(cx, cy);
    setTimeout(() => {
      this.zoomArea.pan(cx, cy, { animate: true });
    }, 1000);
  }

  locationWidth = 44 * 16;
  locationHeight = 27 * 16;
  gapWidth = 22 * 16;
  gapHeight = 9 * 16;

  private readonly playArea = viewChild<ElementRef>('playArea');

  private zoomArea!: PanzoomObject;
}
