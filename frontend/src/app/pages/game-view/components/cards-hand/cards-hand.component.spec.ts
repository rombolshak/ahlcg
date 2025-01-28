import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardsHandComponent } from './cards-hand.component';
import { cardA, cardE, cardS } from 'models/test/test-cards';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('CardsHandComponent', () => {
  let component: CardsHandComponent;
  let fixture: ComponentFixture<CardsHandComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardsHandComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CardsHandComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cards', [
      {
        id: 1,
        cardInfo: cardA,
      },
      {
        id: 2,
        cardInfo: cardS,
      },
      {
        id: 13,
        cardInfo: cardE,
      },
    ]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all cards', () => {
    expect(fixture.debugElement.queryAll(By.css('ah-card')).length).toBe(3);
  });

  it('should display nothing', () => {
    fixture = TestBed.createComponent(CardsHandComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cards', []);
    fixture.detectChanges();

    expect(fixture.debugElement.queryAll(By.css('ah-card')).length).toBe(0);
  });
});
