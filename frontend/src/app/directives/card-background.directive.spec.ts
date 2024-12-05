import { CardBackgroundDirective } from './card-background.directive';
import { Component, input } from '@angular/core';
import { CardOutlineDirective } from './card-outline.directive';
import { PlayerCardClass } from '../models/player-card.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';

@Component({
  imports: [CardBackgroundDirective],
  template: ` <div ahCardBackground [cardClass]="cardClass()"></div>`,
})
class TestComponent {
  cardClass = input.required<PlayerCardClass>();
}

describe('CardBackgroundDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('cardClass', PlayerCardClass.Rogue);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture.debugElement.children[0].classes).toEqual({
      'bg-green-200': true,
    });
  });
});
