import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftPanelComponent } from './left-panel.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { testAgenda } from 'shared/domain/test/test-agenda';
import { testAct } from 'shared/domain/test/test-act';
import { InvestigatorS } from 'shared/domain/test/test-investigators';
import { InvestigatorWithState } from '../../../shared/domain/investigator.model';

describe('LeftPanelComponent', () => {
  let component: LeftPanelComponent;
  let fixture: ComponentFixture<LeftPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [LeftPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LeftPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('investigator', {
      ...InvestigatorS,
      threatArea: [],
    } satisfies InvestigatorWithState);
    fixture.componentRef.setInput('agenda', testAgenda);
    fixture.componentRef.setInput('act', testAct);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
