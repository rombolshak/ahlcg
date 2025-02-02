import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlAreaComponent } from './control-area.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('ControlAreaComponent', () => {
  let component: ControlAreaComponent;
  let fixture: ComponentFixture<ControlAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [ControlAreaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlAreaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('assets', []);
    fixture.componentRef.setInput('states', []);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
