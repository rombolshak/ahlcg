import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationComponent } from './location.component';
import { testLocation } from 'shared/domain/test/entities/test-locations';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import {
  InvestigatorG,
  InvestigatorS,
} from 'shared/domain/test/entities/test-investigators';
import { GameStateStore } from '../../../store/game-state.store';
import { testGameState } from '../../../../../shared/domain/test/test-game-state';

describe('LocationComponent', () => {
  let component: LocationComponent;
  let fixture: ComponentFixture<LocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [LocationComponent],
    }).compileComponents();

    const store = TestBed.inject(GameStateStore);
    store.setState(testGameState);
    fixture = TestBed.createComponent(LocationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('locationId', testLocation.id);
    fixture.componentRef.setInput('investigatorsIds', [
      InvestigatorS.id,
      InvestigatorG.id,
    ]);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have header', () => {
    expect(
      fixture.debugElement.queryAll(By.css('ah-location-header')).length,
    ).toBe(1);
  });

  it('should have image', () => {
    expect(
      fixture.debugElement.queryAll(By.css('img[alt="location-illustration"]'))
        .length,
    ).toBe(1);
  });

  it('should display investigators', () => {
    expect(
      fixture.debugElement.queryAll(By.css('ah-investigator-avatar')).length,
    ).toBe(2);
  });

  it('should display enemies', () => {
    expect(
      fixture.debugElement.queryAll(By.css('img[alt="enemy"]')).length,
    ).toBe(InvestigatorS.threatArea.length + InvestigatorG.threatArea.length);
  });
});
