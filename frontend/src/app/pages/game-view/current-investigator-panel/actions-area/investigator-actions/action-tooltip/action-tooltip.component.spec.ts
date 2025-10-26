import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { testActions } from '@domain/test/test-actions';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { ActionTooltipComponent } from './action-tooltip.component';

describe('ActionTooltipComponent', () => {
  let component: ActionTooltipComponent;
  let fixture: ComponentFixture<ActionTooltipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionTooltipComponent, getTranslocoModule()],
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
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
