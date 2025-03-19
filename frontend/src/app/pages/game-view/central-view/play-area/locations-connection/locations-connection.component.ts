import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ConnectionPointsService } from './connection-points.service';

@Component({
  selector: 'ah-locations-connection',
  imports: [],
  templateUrl: './locations-connection.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsConnectionComponent {
  readonly from = input.required<string>();
  readonly to = input.required<string>();

  private readonly connectionsService = inject(ConnectionPointsService);
  private readonly options = {
    horizontalStep: 0.25,
    verticalStep: 0.33,
    borderOffset: 12,
  };

  protected readonly connection = computed(() => {
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

  protected readonly end = computed(() => {
    const endElement = document.querySelector(this.to());
    if (!(endElement instanceof HTMLElement)) {
      throw new Error('Could not find element by selector ' + this.to());
    }

    return {
      x: endElement.offsetLeft,
      y: endElement.offsetTop + endElement.offsetHeight,
    };
  });
}
