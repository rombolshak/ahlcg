import { TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Enemy } from '../../../../shared/domain/entities/enemy.model';
import {
  cardA2,
  cardA3,
} from '../../../../shared/domain/test/entities/test-cards';
import { testEnemy } from '../../../../shared/domain/test/entities/test-enemies';
import { InvestigatorS } from '../../../../shared/domain/test/entities/test-investigators';
import { ThreatsSeverityService } from './threats-severity.service';

describe('ThreatsSeverityService', () => {
  let service: ThreatsSeverityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(ThreatsSeverityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should calculate null input to 0 severity', () => {
    expect(service.getThreatsSeverity(signal(null))()).toEqual({
      healthSeverity: 0,
      sanitySeverity: 0,
    });
  });

  it('should calculate empty threats to 0 severity', () => {
    const modelSignal = signal({ ...InvestigatorS, threats: [], assets: [] });
    const testee = service.getThreatsSeverity(modelSignal);

    expect(testee()).toEqual({ healthSeverity: 0, sanitySeverity: 0 });
  });

  it('should calculate threats severity correctly', () => {
    const modelSignal = signal({
      ...InvestigatorS,
      health: { max: 10, damaged: 2 },
      sanity: { max: 10, damaged: 3 },
      threats: [] as Enemy[],
      assets: [cardA2, cardA3], // +2 health +1 sanity
    });

    const testee = service.getThreatsSeverity(modelSignal);
    modelSignal.update((m) => {
      return { ...m, threats: [testEnemy] }; // damage 2 horror 1
    });

    expect(testee()).toEqual({
      healthSeverity: 4 / 12,
      sanitySeverity: 4 / 11,
    });
  });
});
