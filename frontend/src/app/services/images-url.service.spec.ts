import { TestBed } from '@angular/core/testing';

import { CreateOverlay, ImagesUrlService } from './images-url.service';
import { CardClass, CardSlot, PlayerCardType, SkillType } from '../models/player-card.model';

describe('ImagesUrlService', () => {
  let service: ImagesUrlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImagesUrlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate card template url', () => {
    expect(service.getTemplate(PlayerCardType.Asset, CardClass.Guardian)).toEqual(`/assets/images/card-templates/Asset-Guardian.png`);
    expect(service.getTemplate(PlayerCardType.Skill, CardClass.Mystic)).toEqual(`/assets/images/card-templates/Skill-Mystic.png`);
    expect(service.getTemplate(PlayerCardType.Event, CardClass.Neutral)).toEqual(`/assets/images/card-templates/Event-Neutral.png`);
  });

  it('should generate card overlays url', () => {
    expect(service.getOverlay(CreateOverlay.skillBox(CardClass.Guardian))).toEqual(`/assets/images/card-overlays/SkillBox-Guardian.png`);
    expect(service.getOverlay(CreateOverlay.cardSlot(CardSlot.Ally))).toEqual(`/assets/images/card-overlays/Slot-Ally.png`);
    expect(service.getOverlay(CreateOverlay.skillIcon(SkillType.Agility))).toEqual(`/assets/images/card-overlays/SkillIcon-Agility.png`);
  });

  it('should generate set icons', () => {
    expect(service.getSetIcon('test')).toEqual(`/assets/images/set-icons/test.png`);
  });

  it('should generate card illustrations', () => {
    expect(service.getIllustration({
      set: 'test',
      index: '015'
    })).toEqual(`/assets/images/illustrations/test/015.webp`);
  });
});
