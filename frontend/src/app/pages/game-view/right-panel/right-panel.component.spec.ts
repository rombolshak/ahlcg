import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightPanelComponent } from './right-panel.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('RightPanelComponent', () => {
  let component: RightPanelComponent;
  let fixture: ComponentFixture<RightPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [RightPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RightPanelComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
