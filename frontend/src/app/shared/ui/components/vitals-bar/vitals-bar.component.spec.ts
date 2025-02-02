import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VitalsBarComponent } from './vitals-bar.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('VitalsBarComponent', () => {
  let component: VitalsBarComponent;
  let fixture: ComponentFixture<VitalsBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [VitalsBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VitalsBarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
