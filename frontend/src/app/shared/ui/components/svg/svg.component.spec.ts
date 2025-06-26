import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SvgComponent } from './svg.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('SvgComponent', () => {
  let component: SvgComponent;
  let fixture: ComponentFixture<SvgComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SvgComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(SvgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
