import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorTokenComponent } from './investigator-token.component';

describe('InvestigatorTokenComponent', () => {
  let component: InvestigatorTokenComponent;
  let fixture: ComponentFixture<InvestigatorTokenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorTokenComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorTokenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
