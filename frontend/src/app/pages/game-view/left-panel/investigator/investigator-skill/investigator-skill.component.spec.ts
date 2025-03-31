import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorSkillComponent } from './investigator-skill.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('InvestigatorSkillComponent', () => {
  let component: InvestigatorSkillComponent;
  let fixture: ComponentFixture<InvestigatorSkillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [InvestigatorSkillComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorSkillComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('type', 'intellect');
    fixture.componentRef.setInput('value', 3);
    fixture.componentRef.setInput('investigatorClass', 'mystic');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
