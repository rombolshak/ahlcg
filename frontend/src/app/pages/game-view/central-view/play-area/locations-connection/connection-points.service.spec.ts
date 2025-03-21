import { TestBed } from '@angular/core/testing';

import {
  ConnectionPointsService,
  Connector,
  HorizontalConnectorPosition,
  Plane,
  VerticalConnectorPosition,
} from './connection-points.service';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('ConnectionPointsService', () => {
  let service: ConnectionPointsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
    });
    service = TestBed.inject(ConnectionPointsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should calculate connectors', () => {
    validateHorizontalConnectors(-16, Plane.Top, Plane.Bottom);
    validateHorizontalConnectors(16, Plane.Bottom, Plane.Top);
    validateVerticalConnectors(-16, Plane.Left, Plane.Right);
    validateVerticalConnectors(16, Plane.Right, Plane.Left);
  });

  it('should calculate point on plane', () => {
    validateHorizontalPoints(0, Plane.Top);
    validateHorizontalPoints(12, Plane.Bottom);
    validateVerticalPoints(0, Plane.Left);
    validateVerticalPoints(12, Plane.Right);
  });

  function validateHorizontalPoints(
    y: number,
    plane: Plane.Top | Plane.Bottom,
  ) {
    const box = {
      offsetTop: 0,
      offsetLeft: 0,
      offsetWidth: 12,
      offsetHeight: 12,
    };

    const options = {
      verticalStep: 0.33,
      horizontalStep: 0.25,
      borderOffset: 0,
    };

    expect(
      service.getPoint(
        box,
        {
          plane: plane,
          position: HorizontalConnectorPosition.CornerLeft,
        },
        options,
      ),
    ).toEqual({ x: 0, y: y });

    expect(
      service.getPoint(
        box,
        {
          plane: plane,
          position: HorizontalConnectorPosition.Left,
        },
        options,
      ),
    ).toEqual({ x: 3, y: y });

    expect(
      service.getPoint(
        box,
        {
          plane: plane,
          position: HorizontalConnectorPosition.Center,
        },
        options,
      ),
    ).toEqual({ x: 6, y: y });

    expect(
      service.getPoint(
        box,
        {
          plane: plane,
          position: HorizontalConnectorPosition.Right,
        },
        options,
      ),
    ).toEqual({ x: 9, y: y });

    expect(
      service.getPoint(
        box,
        {
          plane: plane,
          position: HorizontalConnectorPosition.CornerRight,
        },
        options,
      ),
    ).toEqual({ x: 12, y: y });
  }

  function validateVerticalPoints(x: number, plane: Plane.Left | Plane.Right) {
    const box = {
      offsetTop: 0,
      offsetLeft: 0,
      offsetWidth: 12,
      offsetHeight: 12,
    };

    const options = {
      verticalStep: 0.33,
      horizontalStep: 0.25,
      borderOffset: 0,
    };

    expect(
      service.getPoint(
        box,
        {
          plane: plane,
          position: VerticalConnectorPosition.Top,
        },
        options,
      ),
    ).toEqual({ x: x, y: 3.96 });

    expect(
      service.getPoint(
        box,
        {
          plane: plane,
          position: VerticalConnectorPosition.Center,
        },
        options,
      ),
    ).toEqual({ x: x, y: 6 });

    expect(
      service.getPoint(
        box,
        {
          plane: plane,
          position: VerticalConnectorPosition.Bottom,
        },
        options,
      ),
    ).toEqual({ x: x, y: 8.04 });
  }

  function validateHorizontalConnectors(
    y: number,
    fromPlane: Plane.Top | Plane.Bottom,
    toPlane: Plane.Top | Plane.Bottom,
  ) {
    validateConnectors(
      -16,
      y,
      {
        plane: fromPlane,
        position: HorizontalConnectorPosition.CornerLeft,
      },
      {
        plane: toPlane,
        position: HorizontalConnectorPosition.CornerRight,
      },
    );

    validateConnectors(
      -8,
      y,
      {
        plane: fromPlane,
        position: HorizontalConnectorPosition.Left,
      },
      {
        plane: toPlane,
        position: HorizontalConnectorPosition.Right,
      },
    );

    validateConnectors(
      0,
      y,
      {
        plane: fromPlane,
        position: HorizontalConnectorPosition.Center,
      },
      {
        plane: toPlane,
        position: HorizontalConnectorPosition.Center,
      },
    );

    validateConnectors(
      8,
      y,
      {
        plane: fromPlane,
        position: HorizontalConnectorPosition.Right,
      },
      {
        plane: toPlane,
        position: HorizontalConnectorPosition.Left,
      },
    );

    validateConnectors(
      16,
      y,
      {
        plane: fromPlane,
        position: HorizontalConnectorPosition.CornerRight,
      },
      {
        plane: toPlane,
        position: HorizontalConnectorPosition.CornerLeft,
      },
    );
  }

  function validateVerticalConnectors(
    x: number,
    fromPlane: Plane.Left | Plane.Right,
    toPlane: Plane.Left | Plane.Right,
  ) {
    validateConnectors(
      x,
      -8,
      {
        plane: fromPlane,
        position: VerticalConnectorPosition.Top,
      },
      {
        plane: toPlane,
        position: VerticalConnectorPosition.Bottom,
      },
    );

    validateConnectors(
      x,
      0,
      {
        plane: fromPlane,
        position: VerticalConnectorPosition.Center,
      },
      {
        plane: toPlane,
        position: VerticalConnectorPosition.Center,
      },
    );

    validateConnectors(
      x,
      8,
      {
        plane: fromPlane,
        position: VerticalConnectorPosition.Bottom,
      },
      {
        plane: toPlane,
        position: VerticalConnectorPosition.Top,
      },
    );
  }

  function validateConnectors(
    x: number,
    y: number,
    from: Connector,
    to: Connector,
  ) {
    const centralBox = {
      offsetTop: 0,
      offsetLeft: 0,
      offsetWidth: 10,
      offsetHeight: 10,
    };

    const testBox = {
      offsetTop: y,
      offsetLeft: x,
      offsetWidth: 10,
      offsetHeight: 10,
    };

    expect(service.getConnectors(centralBox, testBox)).toEqual([from, to]);
  }
});
