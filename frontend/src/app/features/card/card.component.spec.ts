import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PlayerCard } from '@domain/entities/player-card.model';
import { cardA, cardA2, cardE, cardS, displayOption } from '@testing/entities/test-cards';
import { getTranslocoModule } from '@testing/transloco.testing';
import { CardComponent } from './card.component';

const notesDescription = {
  fields: ['title'],
  traits: ['item', 'book', 'science'],
  abilities: 2,
  copyright: { illustrator: 'Pixoloid Studious', ffg: '2022' },
};

const planDescription = {
  fields: ['title', 'flavor'],
  traits: ['insight', 'tactic'],
  abilities: 1,
  copyright: { illustrator: 'Robert Laskey', ffg: '2016' },
};

const accursedDescription = {
  fields: ['title', 'flavor'],
  traits: ['innate', 'cursed'],
  abilities: 1,
  copyright: { illustrator: 'David Hovey', ffg: '2024' },
};

describe('CardComponent', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
      imports: [CardComponent, getTranslocoModule()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  function createFixture(card: PlayerCard): ComponentFixture<CardComponent> {
    const fixture = TestBed.createComponent(CardComponent);
    fixture.componentRef.setInput('card', card);
    fixture.componentRef.setInput('displayOptions', displayOption);
    return fixture;
  }

  it('renders nothing before info arrives', async () => {
    const fixture = createFixture(cardA);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeFalsy();

    http.expectOne('/assets/cards/09/045.json').flush(notesDescription);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeTruthy();
  });

  it('shows an asset card', async () => {
    const fixture = createFixture(cardA);
    await fixture.whenStable();
    http.expectOne('/assets/cards/09/045.json').flush(notesDescription);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('ah-event-card'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('ah-skill-card'))).toBeFalsy();
  });

  it('shows an event card', async () => {
    const fixture = createFixture(cardE);
    await fixture.whenStable();
    http.expectOne('/assets/cards/02/107.json').flush(planDescription);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('ah-event-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('ah-skill-card'))).toBeFalsy();
  });

  it('shows a skill card', async () => {
    const fixture = createFixture(cardS);
    await fixture.whenStable();
    http.expectOne('/assets/cards/10/095.json').flush(accursedDescription);
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('ah-skill-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('ah-event-card'))).toBeFalsy();
  });

  it('fetches a shared setInfo once for two cards', async () => {
    const fixture = createFixture(cardA);
    const fixture2 = createFixture(cardA2);
    await fixture.whenStable();
    await fixture2.whenStable();

    const requests = http.match('/assets/cards/09/045.json');
    expect(requests.length).toBe(1);
    requests[0]?.flush(notesDescription);
  });
});
