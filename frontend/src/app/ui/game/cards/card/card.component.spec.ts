import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { cardA, cardE, cardS, displayOption } from '@testing/entities/test-cards';
import { serveCardAssets } from '@testing/serve-card-assets';
import { getTranslocoModule } from '@testing/transloco.testing';
import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(withInterceptors([serveCardAssets]))],
      imports: [CardComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show Asset', async () => {
    fixture.componentRef.setInput('card', cardA);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('ah-skill-card'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('ah-event-card'))).toBeFalsy();
  });

  it('should show Skill', async () => {
    fixture.componentRef.setInput('card', cardS);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('ah-skill-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('ah-event-card'))).toBeFalsy();
  });

  it('should show Event', async () => {
    fixture.componentRef.setInput('card', cardE);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('ah-event-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('ah-skill-card'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeFalsy();
  });
});
