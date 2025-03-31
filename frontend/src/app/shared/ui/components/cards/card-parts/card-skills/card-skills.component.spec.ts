import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardSkillsComponent } from './card-skills.component';
import { By } from '@angular/platform-browser';
import { cardA, displayOption } from 'shared/domain/test/test-cards';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('CardSkillsComponent', () => {
  let component: CardSkillsComponent;
  let fixture: ComponentFixture<CardSkillsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [CardSkillsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardSkillsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print skills', () => {
    expect(fixture.debugElement.queryAll(By.css('div')).length).toEqual(
      (cardA.skills.agility ?? 0) +
        (cardA.skills.combat ?? 0) +
        (cardA.skills.intellect ?? 0) +
        (cardA.skills.wild ?? 0) +
        (cardA.skills.willpower ?? 0),
    );
  });
});
