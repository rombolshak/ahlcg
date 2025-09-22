import { TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { ImagesUrlService } from './images-url.service';

describe('ImagesUrlService', () => {
  let service: ImagesUrlService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(ImagesUrlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate card template url', () => {
    expect(service.getUrl(['card-template', 'asset', 'guardian'])).toEqual(
      `/assets/images/card-template/asset/guardian.webp`,
    );

    expect(service.getUrl(['card-template', 'skill', 'mystic'])).toEqual(
      `/assets/images/card-template/skill/mystic.webp`,
    );

    expect(service.getUrl(['card-template', 'event', 'neutral'])).toEqual(
      `/assets/images/card-template/event/neutral.webp`,
    );
  });

  it('should generate card overlays url', () => {
    expect(service.getUrl(['card-overlay', 'slot', 'ally'])).toEqual(
      `/assets/images/card-overlay/slot/ally.webp`,
    );

    expect(service.getUrl(['card-overlay', 'skill', 'agility'])).toEqual(
      `/assets/images/card-overlay/skill/agility.webp`,
    );
  });

  it('should generate set icons', () => {
    expect(service.getUrl(['set-icon', 'test'])).toEqual(
      `/assets/images/set-icon/test.webp`,
    );
  });

  it('should generate card illustrations', () => {
    expect(service.getUrl(['illustration', 'test', '015'])).toEqual(
      `/assets/images/illustration/test/015.webp`,
    );
  });
});
