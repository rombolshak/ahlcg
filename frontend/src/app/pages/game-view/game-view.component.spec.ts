import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { serveCardAssets } from 'shared/domain/test/serve-card-assets';
import { GameViewComponent } from './game-view.component';

describe('GameViewComponent', () => {
  let component: GameViewComponent;
  let fixture: ComponentFixture<GameViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
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
