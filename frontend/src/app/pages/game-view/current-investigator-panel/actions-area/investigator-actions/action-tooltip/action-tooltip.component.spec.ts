import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { serveCardAssets } from '@testing/serve-card-assets';
import { testActions } from '@testing/test-actions';
import { getTranslocoModule } from '@testing/transloco.testing';
import { ActionTooltipComponent } from './action-tooltip.component';

describe('ActionTooltipComponent', () => {
  let component: ActionTooltipComponent;
  let fixture: ComponentFixture<ActionTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionTooltipComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionTooltipComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('action', testActions[0]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
