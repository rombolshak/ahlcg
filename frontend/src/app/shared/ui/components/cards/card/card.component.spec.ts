import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardComponent } from './card.component';
import {
  cardA,
  cardE,
  cardS,
  displayOption,
} from 'shared/domain/test/entities/test-cards';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { getTranslocoModule } from '../../../../domain/test/transloco.testing';
import { provideHttpClient } from '@angular/common/http';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()],
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
