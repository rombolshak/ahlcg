import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionsSelectorComponent } from './actions-selector.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('ActionsSelectorComponent', () => {
  let component: ActionsSelectorComponent;
  let fixture: ComponentFixture<ActionsSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionsSelectorComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionsSelectorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('actions', []);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
