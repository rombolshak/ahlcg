import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { ActionAreaButtonsComponent } from './action-area-buttons.component';

describe('ActionAreaButtonsComponent', () => {
  let component: ActionAreaButtonsComponent;
  let fixture: ComponentFixture<ActionAreaButtonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [ActionAreaButtonsComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionAreaButtonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
