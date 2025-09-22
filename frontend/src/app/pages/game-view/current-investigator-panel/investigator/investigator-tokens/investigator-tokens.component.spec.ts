import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorTokensComponent } from './investigator-tokens.component';

describe('InvestigatorTokensComponent', () => {
  let component: InvestigatorTokensComponent;
  let fixture: ComponentFixture<InvestigatorTokensComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorTokensComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorTokensComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
