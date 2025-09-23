import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { CurrentInvestigatorPanelComponent } from './current-investigator-panel.component';

describe('LeftPanelComponent', () => {
  let component: CurrentInvestigatorPanelComponent;
  let fixture: ComponentFixture<CurrentInvestigatorPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [CurrentInvestigatorPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CurrentInvestigatorPanelComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
