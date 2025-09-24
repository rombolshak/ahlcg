import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { InvestigatorTokenComponent } from './investigator-token.component';

describe('InvestigatorTokenComponent', () => {
  let component: InvestigatorTokenComponent;
  let fixture: ComponentFixture<InvestigatorTokenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [InvestigatorTokenComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorTokenComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('faction', 'rogue');
    fixture.componentRef.setInput('type', 'clue');
    fixture.componentRef.setInput('value', 4);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
