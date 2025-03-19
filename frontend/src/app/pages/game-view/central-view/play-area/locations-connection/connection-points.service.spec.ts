import { TestBed } from '@angular/core/testing';

import { ConnectionPointsService } from './connection-points.service';

describe('ConnectionPointsService', () => {
  let service: ConnectionPointsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConnectionPointsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
