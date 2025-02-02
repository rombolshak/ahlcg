import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardAbilitiesComponent } from './card-abilities.component';
import { cardA, displayOption } from 'shared/domain/test/test-cards';
import { By } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('CardAbilityComponent', () => {
  let component: CardAbilitiesComponent;
  let fixture: ComponentFixture<CardAbilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [CardAbilitiesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardAbilitiesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print abilities', () => {
    expect(fixture.debugElement.queryAll(By.css('p')).length).toEqual(
      cardA.abilities.length,
    );
  });
});
