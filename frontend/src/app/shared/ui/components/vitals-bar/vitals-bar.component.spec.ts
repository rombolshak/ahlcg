import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitalsBarComponent } from './vitals-bar.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('VitalsBarComponent', () => {
  let component: VitalsBarComponent;
  let fixture: ComponentFixture<VitalsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [VitalsBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VitalsBarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('entity', { health: { max: 4, damaged: 1 } });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
