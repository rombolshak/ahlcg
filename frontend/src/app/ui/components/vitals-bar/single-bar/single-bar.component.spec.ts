import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { SingleBarComponent } from './single-bar.component';

describe('SingleBarComponent', () => {
  let component: SingleBarComponent;
  let fixture: ComponentFixture<SingleBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [SingleBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SingleBarComponent);
    fixture.componentRef.setInput('max', 5);
    fixture.componentRef.setInput('current', 2);
    fixture.componentRef.setInput('goodColor', 'color-red-700');
    fixture.componentRef.setInput('badColor', 'color-red-500');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
