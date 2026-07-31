import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { testLocation } from 'shared/domain/test/entities/test-locations';
import { serveCardAssets } from 'shared/domain/test/serve-card-assets';
import { getTranslocoModule } from 'shared/domain/test/transloco.testing';
import { LocationHeaderComponent } from './location-header.component';

describe('LocationHeaderComponent', () => {
  let component: LocationHeaderComponent;
  let fixture: ComponentFixture<LocationHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
      imports: [LocationHeaderComponent, getTranslocoModule()],
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
    TestBed.tick();
    const text = (fixture.debugElement.nativeElement as HTMLElement).innerText;

    expect(text).toContain('Вход в музей');
  });

  it('should display location shroud and clues', () => {
    const text = (fixture.debugElement.nativeElement as HTMLElement).innerText;

    expect(text).toContain(testLocation.shroud.toString());
    expect(text).toContain(testLocation.clues.toString());
  });

  it('should contain details card', () => {
    expect(fixture.debugElement.queryAll(By.css('ah-card-details-text')).length).toBe(1);
  });
});
