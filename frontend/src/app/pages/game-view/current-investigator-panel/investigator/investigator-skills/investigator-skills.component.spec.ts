import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { InvestigatorSkillsComponent } from './investigator-skills.component';

describe('InvestigatorSkillsComponent', () => {
  let component: InvestigatorSkillsComponent;
  let fixture: ComponentFixture<InvestigatorSkillsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [InvestigatorSkillsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorSkillsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('faction', 'rogue');
    fixture.componentRef.setInput('skills', {
      combat: 1,
      intellect: 2,
      willpower: 3,
      agility: 4,
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
