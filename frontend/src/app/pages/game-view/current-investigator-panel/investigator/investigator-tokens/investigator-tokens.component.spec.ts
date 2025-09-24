import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { InvestigatorTokensComponent } from './investigator-tokens.component';

describe('InvestigatorTokensComponent', () => {
  let component: InvestigatorTokensComponent;
  let fixture: ComponentFixture<InvestigatorTokensComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [InvestigatorTokensComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorTokensComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('faction', 'rogue');
    fixture.componentRef.setInput('tokens', { resource: 3 });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
