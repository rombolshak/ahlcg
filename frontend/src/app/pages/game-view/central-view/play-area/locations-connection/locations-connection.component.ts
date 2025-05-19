import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ConnectionPointsService } from './connection-points.service';
import { GameMap } from 'shared/domain/game-map.model';

@Component({
  selector: 'ah-locations-connection',
  imports: [],
  templateUrl: './locations-connection.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsConnectionComponent {
  readonly map = input.required<GameMap>();
  readonly from = input.required<string>();
  readonly to = input.required<string>();
  readonly fromColor = input<string | undefined>('var(--color-stone-700)');
  readonly toColor = input<string | undefined>('var(--color-stone-700)');

  private readonly connectionsService = inject(ConnectionPointsService);
  private readonly options = {
    horizontalStep: 0.25,
    verticalStep: 0.33,
    borderOffset: 12,
  };

  protected readonly connection = computed(() => {
    // захватываем map(), чтоб срабатывала перерисовка при изменении позиции локации
    this.map().places.filter(
      (p) => p.location === this.from() || p.location === this.to(),
    );

    const startElement = document.querySelector(this.from());
    const endElement = document.querySelector(this.to());

    if (!(startElement instanceof HTMLElement)) {
      throw new Error('Could not find element by selector ' + this.from());
    }

    if (!(endElement instanceof HTMLElement)) {
      throw new Error('Could not find element by selector ' + this.to());
    }

    const [from, to] = this.connectionsService.getConnectors(
      startElement,
      endElement,
    );

    return {
      from: this.connectionsService.getPoint(startElement, from, this.options),
      to: this.connectionsService.getPoint(endElement, to, this.options),
    };
  });

  protected readonly gradientName = computed(
    () =>
      `gradient-${this.sanitize(this.fromColor())}-${this.sanitize(this.toColor())}`,
  );

  protected readonly markerStartName = computed(
    () => `arrow-${this.sanitize(this.fromColor())}`,
  );
  protected readonly markerEndName = computed(
    () => `arrow-${this.sanitize(this.toColor())}`,
  );

  private sanitize(str: string | undefined): string {
    return str?.replace('(', '_').replace(')', '_') ?? '';
  }
}
