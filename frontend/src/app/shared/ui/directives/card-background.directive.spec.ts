import { CardBackgroundDirective } from './card-background.directive';
import {
  Component,
  input,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { PlayerCardClass } from 'shared/domain/player-card.model';
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
      providers: [provideExperimentalZonelessChangeDetection()],
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    fixture.componentRef.setInput('cardClass', PlayerCardClass.Rogue);
    await fixture.whenStable();
  });

  it('should create an instance', () => {
    expect(fixture.debugElement.children[0]?.classes).toEqual({
      'bg-green-200': true,
    });
  });
});
