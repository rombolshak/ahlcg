import { TestBed } from '@angular/core/testing';

import { DialogService } from './dialog.service';
import { provideZonelessChangeDetection } from '@angular/core';

describe('DialogService', () => {
  let service: DialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(DialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
