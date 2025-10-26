import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorActionsComponent } from './investigator-actions.component';

describe('InvestigatorActionsComponent', () => {
  let component: InvestigatorActionsComponent;
  let fixture: ComponentFixture<InvestigatorActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorActionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
