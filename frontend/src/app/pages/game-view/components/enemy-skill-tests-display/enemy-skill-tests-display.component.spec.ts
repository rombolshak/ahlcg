import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnemySkillTestsDisplayComponent } from './enemy-skill-tests-display.component';

describe('EnemySkillTestsDisplayComponent', () => {
  let component: EnemySkillTestsDisplayComponent;
  let fixture: ComponentFixture<EnemySkillTestsDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnemySkillTestsDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EnemySkillTestsDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
