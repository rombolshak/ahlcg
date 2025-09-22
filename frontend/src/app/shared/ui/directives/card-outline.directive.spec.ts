import {
  ChangeDetectionStrategy,
  Component,
  input,
  provideZonelessChangeDetection,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Faction } from 'shared/domain/entities/player-card.model';
import { CardOutlineDirective } from './card-outline.directive';

@Component({
  selector: 'ah-test',
  imports: [CardOutlineDirective],
  template: `
    <div ahCardOutline [cardClass]="cardClass()"></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestComponent {
  readonly cardClass = input.required<Faction>();
}

describe('CardOutlineDirective', () => {
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
      outline: true,
      'outline-2': true,
      'outline-green-400': true,
    });
  });
});
