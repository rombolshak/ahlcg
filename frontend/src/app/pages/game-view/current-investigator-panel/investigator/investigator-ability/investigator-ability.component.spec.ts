import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { InvestigatorAbilityComponent } from './investigator-ability.component';

describe('InvestigatorAbilityComponent', () => {
  let component: InvestigatorAbilityComponent;
  let fixture: ComponentFixture<InvestigatorAbilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorAbilityComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorAbilityComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('faction', 'rogue');
    fixture.componentRef.setInput('text', 'test ability');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
