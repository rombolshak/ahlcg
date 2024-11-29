import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorComponent } from './investigator.component';
import { InvestigatorS } from '../../../../models/test/test-investigators';

describe('InvestigatorComponent', () => {
  let component: InvestigatorComponent;
  let fixture: ComponentFixture<InvestigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('baseModel', InvestigatorS);
    fixture.componentRef.setInput('assetState', {
      damage: 0,
      horror: 0,
      clues: 0,
      resources: 0,
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
