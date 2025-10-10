import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { EmptySlotComponent } from './empty-slot.component';

describe('EmptySlotComponent', () => {
  let component: EmptySlotComponent;
  let fixture: ComponentFixture<EmptySlotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [EmptySlotComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptySlotComponent);
    fixture.componentRef.setInput('slot', 'hand');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
