import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorAbilityComponent } from './investigator-ability.component';

describe('InvestigatorAbilityComponent', () => {
  let component: InvestigatorAbilityComponent;
  let fixture: ComponentFixture<InvestigatorAbilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorAbilityComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorAbilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
