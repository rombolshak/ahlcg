import { CardOutlineDirective } from './card-outline.directive';
import { Component, input } from '@angular/core';
import { PlayerCardClass } from 'models/player-card.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';

@Component({
  imports: [CardOutlineDirective],
  template: ` <div ahCardOutline [cardClass]="cardClass()"></div>`,
})
class TestComponent {
  cardClass = input.required<PlayerCardClass>();
}

describe('CardOutlineDirective', () => {
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
      outline: true,
      'outline-2': true,
      'outline-green-400': true,
    });
  });
});
