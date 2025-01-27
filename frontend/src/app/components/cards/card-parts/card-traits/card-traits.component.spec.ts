import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardTraitsComponent } from './card-traits.component';
import { cardA, displayOption } from 'models/test/test-cards';
import { By } from '@angular/platform-browser';

describe('CardTraitsComponent', () => {
  let component: CardTraitsComponent;
  let fixture: ComponentFixture<CardTraitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardTraitsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardTraitsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print traits', () => {
    expect(fixture.debugElement.queryAll(By.css('span')).length).toEqual(
      cardA.traits.length,
    );

    expect(
      fixture.debugElement.query(By.css('span')).nativeElement.innerText,
    ).toContain(cardA.traits[0]?.displayValue);
  });
});
