import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { GlobalGameInfoPanelComponent } from './global-game-info-panel.component';

describe('RightPanelComponent', () => {
  let component: GlobalGameInfoPanelComponent;
  let fixture: ComponentFixture<GlobalGameInfoPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [GlobalGameInfoPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalGameInfoPanelComponent);
    component = fixture.componentInstance;

    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
