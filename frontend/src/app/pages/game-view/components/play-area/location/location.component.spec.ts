import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationComponent } from './location.component';
import { testLocation } from 'shared/domain/test/test-locations';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { InvestigatorS } from 'shared/domain/test/test-investigators';
import { testEnemy } from 'shared/domain/test/test-enemies';

describe('LocationComponent', () => {
  let component: LocationComponent;
  let fixture: ComponentFixture<LocationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [LocationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('location', testLocation);
    fixture.componentRef.setInput('investigators', [
      { ...InvestigatorS, threatArea: [] },
      { ...InvestigatorS, threatArea: [testEnemy] },
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
    ).toBe(1);
  });
});
