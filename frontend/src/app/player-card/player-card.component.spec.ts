import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerCardComponent } from './player-card.component';
import {
  CardAbilityType,
  CardClass,
  CardSlot,
  PlayerCard,
  PlayerCardType,
  SkillType
} from '../models/player-card.model';

const card: PlayerCard = {
  type: PlayerCardType.Asset,
  class: CardClass.Seeker,
  cost: 1,
  title: 'Исследовательские заметки',
  skills: [SkillType.Intellect, SkillType.Intellect],
  traits: [
    { key: 'Item', displayValue: 'Вещь' },
    { key: 'Tome', displayValue: 'Книга' },
    { key: 'Science', displayValue: 'Наука' }
  ],
  slots: [CardSlot.Hand],
  abilities: [
    {
      type: CardAbilityType.Reaction,
      text: '#r#: After a player card ability places 1 or more of your clues on your location: Place that many resources on Research Notes, as evidence.'
    },
    {
      type: CardAbilityType.Action,
      text: '#n#: Test #i#(0). For each point you succeed by, you may spend 1 evidence to discover 1 clue at your location.'
    }
  ],
  collection: {
    set: '09',
    index: '045'
  },
  copyright: {
    illustrator: 'Illus. Pixoloid Studious',
    ffg: '2022 FFG'
  }
};

describe('PlayerCardComponent', () => {
  let component: PlayerCardComponent;
  let fixture: ComponentFixture<PlayerCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


});
