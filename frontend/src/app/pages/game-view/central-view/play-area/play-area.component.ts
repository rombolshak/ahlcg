import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from '@angular/core';
import Panzoom, { PanzoomObject, PanzoomOptions } from '@panzoom/panzoom';
import { LocationComponent } from './location/location.component';
import { LocationsConnectionComponent } from './locations-connection/locations-connection.component';
import { GameMap } from 'shared/domain/game-map.model';

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
  readonly gameMap = input.required<GameMap>();

  protected readonly connectionColors = computed(() => {
    return this.gameMap().connections.map((conn) => {
      return {
        fromColor: this.gameMap().places.find(
          (l) => l.location.id === conn.from,
        )?.location.color,
        toColor: this.gameMap().places.find((l) => l.location.id === conn.to)
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
