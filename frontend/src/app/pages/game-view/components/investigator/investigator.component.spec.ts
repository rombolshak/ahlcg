import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorComponent } from './investigator.component';
import { InvestigatorS } from 'shared/domain/test/test-investigators';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('InvestigatorComponent', () => {
  let component: InvestigatorComponent;
  let fixture: ComponentFixture<InvestigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
