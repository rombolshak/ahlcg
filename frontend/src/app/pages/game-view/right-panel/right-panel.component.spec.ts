import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightPanelComponent } from './right-panel.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { testAgenda } from '../../../shared/domain/test/test-agenda';
import { testAct } from '../../../shared/domain/test/test-act';

describe('RightPanelComponent', () => {
  let component: RightPanelComponent;
  let fixture: ComponentFixture<RightPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [RightPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RightPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('agenda', testAgenda);
    fixture.componentRef.setInput('act', testAct);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
