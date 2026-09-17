import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { GAME_HUB_CONNECTION_FACTORY } from '@features/games/game-connection.service';
import { HubConnection } from '@microsoft/signalr';
import { serveCardAssets } from '@testing/serve-card-assets';
import { getTranslocoModule } from '@testing/transloco.testing';
import { GameViewComponent } from './game-view.component';

const noop = () => undefined;

const fakeConnection = {
  onreconnecting: noop,
  onreconnected: noop,
  onclose: noop,
  on: noop,
  off: noop,
  start: () => Promise.resolve(),
  stop: () => Promise.resolve(),
  invoke: () => Promise.resolve(),
} as unknown as HubConnection;

describe('GameViewComponent', () => {
  let component: GameViewComponent;
  let fixture: ComponentFixture<GameViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([serveCardAssets])),
        { provide: GAME_HUB_CONNECTION_FACTORY, useValue: () => fakeConnection },
      ],
      imports: [GameViewComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(GameViewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'game-1');
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
