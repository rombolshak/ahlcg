import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetCardComponent } from './asset-card.component';
import { AssetCard, AssetSlot, PlayerCardClass, PlayerCardType, SkillType } from '../../models/player-card.model';
import { CardType } from '../../models/card-base.model';

const card: AssetCard = {
  cardType: CardType.Player,
  playerCardType: PlayerCardType.Asset,
  class: PlayerCardClass.Seeker,
  cost: 1,
  title: 'card-title',
  skills: [SkillType.Intellect, SkillType.Willpower],
  traits: [
    { key: 'Item', displayValue: 'Вещь' },
    { key: 'Tome', displayValue: 'Книга' },
    { key: 'Science', displayValue: 'Наука' }
  ],
  slot: AssetSlot.Hand,
  abilities: [
    '#r#: After a player card ability places 1 or more of your clues on your location: Place that many resources on Research Notes, as evidence.',
    '#n#: Test #i#(0). For each point you succeed by, you may spend 1 evidence to discover 1 clue at your location.'
  ],
  setInfo: {
    set: '09',
    index: '045'
  },
  copyright: {
    illustrator: 'Illus. Pixoloid Studious',
    ffg: '2022 FFG'
  }
};

describe('PlayerCardComponent', () => {
  let component: AssetCardComponent;
  let fixture: ComponentFixture<AssetCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AssetCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', card);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


});
