import { CardOutlineDirective } from './card-outline.directive';
import {
  Component,
  input,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { PlayerCardClass } from 'shared/domain/player-card.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';

@Component({
  selector: 'ah-test',
  imports: [CardOutlineDirective],
  template: `
    <div ahCardOutline [cardClass]="cardClass()"></div>
  `,
})
class TestComponent {
  readonly cardClass = input.required<PlayerCardClass>();
}

describe('CardOutlineDirective', () => {
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    fixture.componentRef.setInput('cardClass', PlayerCardClass.Rogue);
    await fixture.whenStable();
  });

  it('should create an instance', () => {
    expect(fixture.debugElement.children[0]?.classes).toEqual({
      outline: true,
      'outline-2': true,
      'outline-green-400': true,
    });
  });
});
