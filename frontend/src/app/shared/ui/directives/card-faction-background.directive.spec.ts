import {
  ChangeDetectionStrategy,
  Component,
  input,
  provideZonelessChangeDetection,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Faction } from 'shared/domain/entities/player-card.model';
import { CardFactionBackgroundDirective } from './card-faction-background.directive';

@Component({
  selector: 'ah-test',
  imports: [CardFactionBackgroundDirective],
  template: ` <div ahCardFactionBackground [faction]="cardClass()"></div> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestComponent {
  readonly cardClass = input.required<Faction>();
}

describe('CardFactionBackgroundDirective', () => {
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    fixture.componentRef.setInput('cardClass', 'mystic');
    await fixture.whenStable();
  });

  it('should create an instance', () => {
    const style = fixture.debugElement.children[0]?.styles['cssText'];

    expect(fixture.debugElement.children[0]?.classes).toEqual({
      'bg-(image:--bgUrl)': true,
      'bg-cover': true,
      'bg-center': true,
    });

    expect(style).toContain('mystic');
    expect(style).toContain('--bgUrl');
  });
});
