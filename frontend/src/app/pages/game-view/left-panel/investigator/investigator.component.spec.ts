import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestigatorComponent } from './investigator.component';
import { InvestigatorS } from 'shared/domain/test/entities/test-investigators';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from '../../../../shared/domain/test/transloco.testing';
import { provideHttpClient } from '@angular/common/http';

describe('InvestigatorComponent', () => {
  let component: InvestigatorComponent;
  let fixture: ComponentFixture<InvestigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [InvestigatorComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('investigator', InvestigatorS);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
