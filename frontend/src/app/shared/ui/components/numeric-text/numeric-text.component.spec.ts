import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumericTextComponent } from './numeric-text.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('NumericTextComponent', () => {
  let component: NumericTextComponent;
  let fixture: ComponentFixture<NumericTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [NumericTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NumericTextComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 0);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fire event after animation', (done) => {
    component.animationCompleted.subscribe(done);
    fixture.componentRef.setInput('value', 1);
    fixture.detectChanges();
    TestBed.flushEffects();
  });
});
