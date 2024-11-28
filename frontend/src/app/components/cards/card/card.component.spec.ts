import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardComponent } from './card.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CardInfo } from 'models/card-info.model';
import { cardA, cardE, cardS, displayOption } from 'models/test/test-cards';
import { By } from '@angular/platform-browser';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', {} as CardInfo);
    fixture.componentRef.setInput('displayOptions', displayOption);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show Asset', () => {
    fixture.componentRef.setInput('card', cardA);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('ah-skill-card'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('ah-event-card'))).toBeFalsy();
  });

  it('should show Skill', () => {
    fixture.componentRef.setInput('card', cardS);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('ah-skill-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('ah-event-card'))).toBeFalsy();
  });

  it('should show Event', () => {
    fixture.componentRef.setInput('card', cardE);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('ah-event-card'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('ah-skill-card'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('ah-asset-card'))).toBeFalsy();
  });
});
