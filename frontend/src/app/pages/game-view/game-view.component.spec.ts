import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameViewComponent } from './game-view.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('GameViewComponent', () => {
  let component: GameViewComponent;
  let fixture: ComponentFixture<GameViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [GameViewComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(GameViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
