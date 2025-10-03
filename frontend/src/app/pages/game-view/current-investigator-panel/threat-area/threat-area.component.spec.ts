import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import {
  testEnemy,
  testEnemy2,
} from 'shared/domain/test/entities/test-enemies';
import { getTranslocoModule } from '../../../../shared/domain/test/transloco.testing';
import { ThreatAreaComponent } from './threat-area.component';

describe('ThreatAreaComponent', () => {
  let component: ThreatAreaComponent;
  let fixture: ComponentFixture<ThreatAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [ThreatAreaComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(ThreatAreaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('threatArea', [
      {
        ...testEnemy,
        damage: 1,
      },
      {
        ...testEnemy2,
        damage: 3,
      },
    ]);
    fixture.componentRef.setInput('noThreatsText', 'no threats text');
    fixture.componentRef.setInput('threatsSeverity', {
      healthSeverity: 0.5,
      sanitySeverity: 0.5,
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all enemies', () => {
    const enemies = fixture.debugElement.queryAll(
      By.css('ah-investigator-threat-item'),
    );

    expect(enemies.length).toBe(2);
  });

  it('should display text when there are no enemies', () => {
    fixture.componentRef.setInput('threatArea', []);
    fixture.componentRef.setInput('threatsSeverity', {
      healthSeverity: 0,
      sanitySeverity: 0,
    });
    TestBed.tick();

    expect(fixture.debugElement.nativeElement.textContent).toContain(
      'no threats text',
    );
  });
});
