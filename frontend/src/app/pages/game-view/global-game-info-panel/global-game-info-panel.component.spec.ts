import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalGameInfoPanelComponent } from './global-game-info-panel.component';
import { provideZonelessChangeDetection } from '@angular/core';

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
