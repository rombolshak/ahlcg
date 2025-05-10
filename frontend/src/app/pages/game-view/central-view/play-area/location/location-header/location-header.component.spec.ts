import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationHeaderComponent } from './location-header.component';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { testLocation } from 'shared/domain/test/entities/test-locations';
import { By } from '@angular/platform-browser';

describe('LocationHeaderComponent', () => {
  let component: LocationHeaderComponent;
  let fixture: ComponentFixture<LocationHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [LocationHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('location', testLocation);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display location header', () => {
    const text = (fixture.debugElement.nativeElement as HTMLElement).innerText;

    expect(text).toContain(testLocation.info.title);
  });

  it('should display location shroud and clues', () => {
    const text = (fixture.debugElement.nativeElement as HTMLElement).innerText;

    expect(text).toContain(testLocation.shroud.toString());
    expect(text).toContain(testLocation.clues.toString());
  });

  it('should contain details card', () => {
    expect(
      fixture.debugElement.queryAll(By.css('ah-card-details-text')).length,
    ).toBe(1);
  });
});
