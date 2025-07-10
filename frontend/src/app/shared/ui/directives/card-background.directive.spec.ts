import { CardBackgroundDirective } from './card-background.directive';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  provideZonelessChangeDetection,
} from '@angular/core';
import { PlayerCardClassType } from 'shared/domain/entities/player-card.model';
import { ComponentFixture, TestBed } from '@angular/core/testing';

@Component({
  selector: 'ah-test',
  imports: [CardBackgroundDirective],
  template: `
    <div ahCardBackground [cardClass]="cardClass()"></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestComponent {
  readonly cardClass = input.required<PlayerCardClassType>();
}

describe('CardBackgroundDirective', () => {
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    fixture.componentRef.setInput('cardClass', 'rogue');
    await fixture.whenStable();
  });

  it('should create an instance', () => {
    expect(fixture.debugElement.children[0]?.classes).toEqual({
      'to-green-300': true,
      'from-green-200': true,
      'bg-linear-to-b': true,
    });
  });
});
