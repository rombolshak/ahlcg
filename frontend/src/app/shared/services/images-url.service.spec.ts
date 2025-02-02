import { TestBed } from '@angular/core/testing';

import { CreateOverlay, ImagesUrlService } from './images-url.service';
import {
  PlayerCardClass,
  AssetSlot,
  PlayerCardType,
  SkillType,
} from 'shared/domain/player-card.model';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

describe('ImagesUrlService', () => {
  let service: ImagesUrlService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection()],
    });
    service = TestBed.inject(ImagesUrlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate card template url', () => {
    expect(
      service.getTemplate(PlayerCardType.Asset, PlayerCardClass.Guardian),
    ).toEqual(`/assets/images/card-templates/Asset-Guardian.webp`);

    expect(
      service.getTemplate(PlayerCardType.Skill, PlayerCardClass.Mystic),
    ).toEqual(`/assets/images/card-templates/Skill-Mystic.webp`);

    expect(
      service.getTemplate(PlayerCardType.Event, PlayerCardClass.Neutral),
    ).toEqual(`/assets/images/card-templates/Event-Neutral.webp`);
  });

  it('should generate card overlays url', () => {
    expect(
      service.getOverlay(CreateOverlay.skillBox(PlayerCardClass.Guardian)),
    ).toEqual(`/assets/images/card-overlays/SkillBox-Guardian.png`);

    expect(service.getOverlay(CreateOverlay.cardSlot(AssetSlot.Ally))).toEqual(
      `/assets/images/card-overlays/Slot-Ally.png`,
    );

    expect(
      service.getOverlay(CreateOverlay.skillIcon(SkillType.Agility)),
    ).toEqual(`/assets/images/card-overlays/SkillIcon-Agility.png`);
  });

  it('should generate set icons', () => {
    expect(service.getSetIcon('test')).toEqual(
      `/assets/images/set-icons/test.png`,
    );
  });

  it('should generate card illustrations', () => {
    expect(
      service.getIllustration({
        set: 'test',
        index: '015',
      }),
    ).toEqual(`/assets/images/illustrations/test/015.webp`);
  });
});
