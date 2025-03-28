import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorSkillComponent } from './investigator-skill.component';

describe('InvestigatorSkillComponent', () => {
  let component: InvestigatorSkillComponent;
  let fixture: ComponentFixture<InvestigatorSkillComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorSkillComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorSkillComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
