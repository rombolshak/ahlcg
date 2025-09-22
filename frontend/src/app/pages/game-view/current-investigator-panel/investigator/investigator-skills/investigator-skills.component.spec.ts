import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorSkillsComponent } from './investigator-skills.component';

describe('InvestigatorSkillsComponent', () => {
  let component: InvestigatorSkillsComponent;
  let fixture: ComponentFixture<InvestigatorSkillsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorSkillsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorSkillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
