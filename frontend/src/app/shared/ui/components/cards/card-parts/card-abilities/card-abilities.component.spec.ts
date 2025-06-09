import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardAbilitiesComponent } from './card-abilities.component';
import { displayOption } from 'shared/domain/test/entities/test-cards';
import { By } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';

describe('CardAbilityComponent', () => {
  let component: CardAbilitiesComponent;
  let fixture: ComponentFixture<CardAbilitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [CardAbilitiesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardAbilitiesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', {
      abilities: ['test a 1', 'test a 2'],
    });
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print abilities', () => {
    expect(fixture.debugElement.queryAll(By.css('p')).length).toEqual(2);
  });
});
