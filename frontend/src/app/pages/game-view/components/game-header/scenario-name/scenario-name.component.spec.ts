import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioNameComponent } from './scenario-name.component';
import { getTranslocoModule } from 'shared/domain/test/transloco.testing';
import campaign from '../../../../../../../public/assets/i18n/campaigns/notz/en.json';
import scenario from '../../../../../../../public/assets/i18n/campaigns/notz/mm/en.json';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

describe('ScenarioNameComponent', () => {
  let component: ScenarioNameComponent;
  let fixture: ComponentFixture<ScenarioNameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioNameComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioNameComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('campaignId', 'notz');
    fixture.componentRef.setInput('scenarioId', 'mm');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display translated names', () => {
    const nativeElement = fixture.debugElement.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain(campaign.name);
    expect(nativeElement.textContent).toContain(scenario.name);
  });
});
