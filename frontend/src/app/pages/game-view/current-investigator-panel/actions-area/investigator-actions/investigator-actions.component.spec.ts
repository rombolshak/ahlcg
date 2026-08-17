import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { serveCardAssets } from '@testing/serve-card-assets';
import { testActions } from '@testing/test-actions';
import { getTranslocoModule } from '@testing/transloco.testing';
import { InvestigatorActionsComponent } from './investigator-actions.component';

describe('InvestigatorActionsComponent', () => {
  let component: InvestigatorActionsComponent;
  let fixture: ComponentFixture<InvestigatorActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvestigatorActionsComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestigatorActionsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('actions', testActions);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
