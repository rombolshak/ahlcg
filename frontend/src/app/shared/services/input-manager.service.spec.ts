import { TestBed } from '@angular/core/testing';

import { InputManagerService } from 'shared/services/input-manager.service';

describe('InputManagerService', () => {
  let service: InputManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InputManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
