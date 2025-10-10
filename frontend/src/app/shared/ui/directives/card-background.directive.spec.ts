import {
  ChangeDetectionStrategy,
  Component,
  input,
  provideZonelessChangeDetection,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Faction } from 'shared/domain/entities/player-card.model';
import { CardBackgroundDirective } from './card-background.directive';

@Component({
  selector: 'ah-test',
  imports: [CardBackgroundDirective],
  template: ` <div ahCardBackground [faction]="cardClass()"></div> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestComponent {
  readonly cardClass = input.required<Faction>();
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
      'to-faction-rogue-darker': true,
      'from-faction-rogue': true,
      'bg-radial-[at_25%_25%]': true,
    });
  });
});
