import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardSkillsComponent } from './card-skills.component';
import { cardA, displayOption } from '../../models/test/test-cards';
import { By } from '@angular/platform-browser';

describe('CardSkillsComponent', () => {
  let component: CardSkillsComponent;
  let fixture: ComponentFixture<CardSkillsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardSkillsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardSkillsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', cardA);
    fixture.componentRef.setInput('displayOptions', displayOption);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should print skills', () => {
    expect(fixture.debugElement.queryAll(By.css('div')).length).toEqual(
      cardA.skills.length,
    );
  });
});
