import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { cardE, cardEInfo, displayOption } from '@domain/testing/entities/test-cards';
import { getTranslocoModule } from '@testing/transloco.testing';
import { EventCardComponent } from './event-card.component';

describe('EventCardComponent', () => {
  let component: EventCardComponent;
  let fixture: ComponentFixture<EventCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [EventCardComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(EventCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardE);
    fixture.componentRef.setInput('cardInfo', cardEInfo);
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the player card', () => {
    expect(fixture.debugElement.query(By.css('ah-player-card'))).toBeTruthy();
  });

  it('should show the illustrator in the copyright line', () => {
    expect(fixture.nativeElement.textContent).toContain(cardEInfo.copyright.illustrator);
  });
});
