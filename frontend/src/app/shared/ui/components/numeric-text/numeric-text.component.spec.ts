import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NumericTextComponent } from './numeric-text.component';

describe('NumericTextComponent', () => {
  let component: NumericTextComponent;
  let fixture: ComponentFixture<NumericTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
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

  it('should fire event after animation', async () => {
    const emitted = firstValueFrom(component.animationCompleted);
    fixture.componentRef.setInput('value', 1);
    fixture.detectChanges();
    TestBed.tick();
    await emitted;
  });
});
