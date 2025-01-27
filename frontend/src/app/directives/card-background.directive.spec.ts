import { CardBackgroundDirective } from './card-background.directive';
import { Component, input } from '@angular/core';
import { PlayerCardClass } from 'models/player-card.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';

@Component({
  selector: 'ah-test',
  imports: [CardBackgroundDirective],
  template: `
    <div ahCardBackground [cardClass]="cardClass()"></div>
  `,
})
class TestComponent {
  readonly cardClass = input.required<PlayerCardClass>();
}

describe('CardBackgroundDirective', () => {
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    fixture.componentRef.setInput('cardClass', PlayerCardClass.Rogue);
    fixture.detectChanges();
  });

  it('should create an instance', () => {
    expect(fixture.debugElement.children[0]?.classes).toEqual({
      'bg-green-200': true,
    });
  });
});
