import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorComponent } from './investigator.component';
import { InvestigatorS } from 'shared/domain/test/entities/test-investigators';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('InvestigatorComponent', () => {
  let component: InvestigatorComponent;
  let fixture: ComponentFixture<InvestigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [InvestigatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('investigator', InvestigatorS);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
