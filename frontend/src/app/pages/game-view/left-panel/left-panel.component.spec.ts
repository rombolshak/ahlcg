import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftPanelComponent } from './left-panel.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('LeftPanelComponent', () => {
  let component: LeftPanelComponent;
  let fixture: ComponentFixture<LeftPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [LeftPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LeftPanelComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
