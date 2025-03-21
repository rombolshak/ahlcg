import { Injectable } from '@angular/core';

export enum Plane {
  Top,
  Right,
  Bottom,
  Left,
}

export enum HorizontalConnectorPosition {
  CornerLeft,
  Left,
  Center,
  Right,
  CornerRight,
}

export enum VerticalConnectorPosition {
  Top,
  Center,
  Bottom,
}

export type Connector =
  | TopConnector
  | BottomConnector
  | LeftConnector
  | RightConnector;

interface TopConnector {
  plane: Plane.Top;
  position: HorizontalConnectorPosition;
}

interface BottomConnector {
  plane: Plane.Bottom;
  position: HorizontalConnectorPosition;
}

interface LeftConnector {
  plane: Plane.Left;
  position: VerticalConnectorPosition;
}

interface RightConnector {
  plane: Plane.Right;
  position: VerticalConnectorPosition;
}

interface ElementBox {
  offsetLeft: number;
  offsetTop: number;
  offsetWidth: number;
  offsetHeight: number;
}

@Injectable({
  providedIn: 'root',
})
export class ConnectionPointsService {
  public getConnectors(
    fromEl: ElementBox,
    toEl: ElementBox,
  ): [Connector, Connector] {
    const fromPlane = this.getOriginatingPlane(fromEl, toEl);
    const point = this.getConnectorPosition(fromEl, toEl, fromPlane);
    const fromConnector = { plane: fromPlane, position: point } as Connector;
    const toConnector = this.getMatchingConnector(fromConnector);
    return [fromConnector, toConnector];
  }

  public getPoint(
    el: ElementBox,
    connector: Connector,
    options: {
      horizontalStep: number;
      verticalStep: number;
      borderOffset: number;
    },
  ): { x: number; y: number } {
    switch (connector.plane) {
      case Plane.Top:
        return {
          x: this.getPointOnPlane(
            el.offsetLeft,
            el.offsetWidth,
            this.getHorizontalStep(connector.position, options.horizontalStep),
          ),
          y: el.offsetTop - options.borderOffset,
        };
      case Plane.Bottom:
        return {
          x: this.getPointOnPlane(
            el.offsetLeft,
            el.offsetWidth,
            this.getHorizontalStep(connector.position, options.horizontalStep),
          ),
          y: el.offsetTop + el.offsetHeight + options.borderOffset,
        };
      case Plane.Left:
        return {
          x: el.offsetLeft - options.borderOffset,
          y: this.getPointOnPlane(
            el.offsetTop,
            el.offsetHeight,
            this.getVerticalStep(connector.position, options.verticalStep),
          ),
        };
      case Plane.Right:
        return {
          x: el.offsetLeft + el.offsetWidth + options.borderOffset,
          y: this.getPointOnPlane(
            el.offsetTop,
            el.offsetHeight,
            this.getVerticalStep(connector.position, options.verticalStep),
          ),
        };
    }
  }

  private getHorizontalStep(
    position: HorizontalConnectorPosition,
    step: number,
  ) {
    switch (position) {
      case HorizontalConnectorPosition.CornerLeft:
        return 0;
      case HorizontalConnectorPosition.CornerRight:
        return 1;
      case HorizontalConnectorPosition.Left:
        return step;
      case HorizontalConnectorPosition.Center:
        return 0.5;
      case HorizontalConnectorPosition.Right:
        return 1 - step;
    }
  }

  private getVerticalStep(position: VerticalConnectorPosition, step: number) {
    switch (position) {
      case VerticalConnectorPosition.Top:
        return step;
      case VerticalConnectorPosition.Bottom:
        return 1 - step;
      case VerticalConnectorPosition.Center:
        return 0.5;
    }
  }

  private getPointOnPlane(start: number, length: number, step: number) {
    return start + length * step;
  }

  private getOriginatingPlane(fromEl: ElementBox, toEl: ElementBox): Plane {
    if (fromEl.offsetTop + fromEl.offsetHeight <= toEl.offsetTop)
      return Plane.Bottom;
    if (toEl.offsetTop + toEl.offsetHeight <= fromEl.offsetTop)
      return Plane.Top;
    if (fromEl.offsetLeft < toEl.offsetLeft) return Plane.Right;
    return Plane.Left;
  }

  private getConnectorPosition(
    fromEl: ElementBox,
    toEl: ElementBox,
    fromPlane: Plane,
  ) {
    switch (fromPlane) {
      case Plane.Top:
      case Plane.Bottom:
        if (fromEl.offsetLeft + fromEl.offsetWidth <= toEl.offsetLeft)
          return HorizontalConnectorPosition.CornerRight;
        if (fromEl.offsetLeft >= toEl.offsetLeft + toEl.offsetWidth)
          return HorizontalConnectorPosition.CornerLeft;
        if (fromEl.offsetLeft < toEl.offsetLeft)
          return HorizontalConnectorPosition.Right;
        if (fromEl.offsetLeft > toEl.offsetLeft)
          return HorizontalConnectorPosition.Left;
        return HorizontalConnectorPosition.Center;
      case Plane.Left:
      case Plane.Right:
        if (fromEl.offsetTop < toEl.offsetTop)
          return VerticalConnectorPosition.Bottom;
        if (toEl.offsetTop < fromEl.offsetTop)
          return VerticalConnectorPosition.Top;
        return VerticalConnectorPosition.Center;
    }
  }

  private getMatchingConnector(connector: Connector): Connector {
    switch (connector.plane) {
      case Plane.Top:
        return {
          plane: Plane.Bottom,
          position: this.getMatchingHorizontalPosition(connector.position),
        };
      case Plane.Bottom:
        return {
          plane: Plane.Top,
          position: this.getMatchingHorizontalPosition(connector.position),
        };
      case Plane.Left:
        return {
          plane: Plane.Right,
          position: this.getMatchingVerticalPosition(connector.position),
        };
      case Plane.Right:
        return {
          plane: Plane.Left,
          position: this.getMatchingVerticalPosition(connector.position),
        };
    }
  }

  private getMatchingHorizontalPosition(position: HorizontalConnectorPosition) {
    switch (position) {
      case HorizontalConnectorPosition.CornerLeft:
        return HorizontalConnectorPosition.CornerRight;
      case HorizontalConnectorPosition.Left:
        return HorizontalConnectorPosition.Right;
      case HorizontalConnectorPosition.Center:
        return HorizontalConnectorPosition.Center;
      case HorizontalConnectorPosition.Right:
        return HorizontalConnectorPosition.Left;
      case HorizontalConnectorPosition.CornerRight:
        return HorizontalConnectorPosition.CornerLeft;
    }
  }

  private getMatchingVerticalPosition(position: VerticalConnectorPosition) {
    switch (position) {
      case VerticalConnectorPosition.Top:
        return VerticalConnectorPosition.Bottom;
      case VerticalConnectorPosition.Center:
        return VerticalConnectorPosition.Center;
      case VerticalConnectorPosition.Bottom:
        return VerticalConnectorPosition.Top;
    }
  }
}
