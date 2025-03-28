import { TestBed } from '@angular/core/testing';

import { CreateOverlay, ImagesUrlService } from './images-url.service';
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
    expect(service.getTemplate('asset', 'guardian')).toEqual(
      `/assets/images/card-templates/asset-guardian.webp`,
    );

    expect(service.getTemplate('skill', 'mystic')).toEqual(
      `/assets/images/card-templates/skill-mystic.webp`,
    );

    expect(service.getTemplate('event', 'neutral')).toEqual(
      `/assets/images/card-templates/event-neutral.webp`,
    );
  });

  it('should generate card overlays url', () => {
    expect(service.getOverlay(CreateOverlay.skillBox('guardian'))).toEqual(
      `/assets/images/card-overlays/SkillBox-guardian.png`,
    );

    expect(service.getOverlay(CreateOverlay.cardSlot('ally'))).toEqual(
      `/assets/images/card-overlays/Slot-ally.png`,
    );

    expect(service.getOverlay(CreateOverlay.skillIcon('agility'))).toEqual(
      `/assets/images/card-overlays/SkillIcon-agility.png`,
    );
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
