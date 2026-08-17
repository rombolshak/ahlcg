import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { SvgComponent } from './svg.component';

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
    fixture.componentRef.setInput('name', 'test');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
