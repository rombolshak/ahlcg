import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import Panzoom, { PanzoomObject, PanzoomOptions } from '@panzoom/panzoom';
import { LocationComponent } from './location/location.component';
import { LocationsConnectionComponent } from './locations-connection/locations-connection.component';
import { GameStateStore } from '../store/game-state.store';

@Component({
  selector: 'ah-play-area',
  imports: [LocationComponent, LocationsConnectionComponent],
  templateUrl: './play-area.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full h-full overflow-hidden',
  },
})
export class PlayAreaComponent implements AfterViewInit {
  private readonly state = inject(GameStateStore);

  readonly gameMap = computed(() => {
    return this.state.gameState()?.scenarioMap ?? null;
  });

  protected readonly connectionColors = computed(() => {
    if (!this.gameMap()) {
      return [];
    }
    return this.gameMap()?.connections.map((conn) => {
      return {
        fromColor: this.state.getLocation(conn.from).color,
        toColor: this.state.getLocation(conn.to).color,
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
      console.log(this.zoomArea);
    }, 1000);
  }

  locationWidth = 44 * 16;
  locationHeight = 27 * 16;
  gapWidth = 22 * 16;
  gapHeight = 9 * 16;

  private readonly playArea = viewChild<ElementRef>('playArea');

  private zoomArea!: PanzoomObject;
}
