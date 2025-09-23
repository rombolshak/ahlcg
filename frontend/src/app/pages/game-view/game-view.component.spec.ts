import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '../../shared/domain/test/transloco.testing';
import { GameViewComponent } from './game-view.component';

describe('GameViewComponent', () => {
  let component: GameViewComponent;
  let fixture: ComponentFixture<GameViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
      imports: [GameViewComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(GameViewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open debug panel', async () => {
    await component.toggleDebug();
    await fixture.whenStable();

    expect(component.showDebug).toBe(true);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('ah-debug-panel'))).toBeTruthy();
  });
});
