import { imageUrl } from './image-url';

describe('imageUrl', () => {
  it('should generate card template url', () => {
    expect(imageUrl(['card-template', 'asset', 'guardian'])).toEqual(`/assets/images/card-template/asset/guardian.webp`);

    expect(imageUrl(['card-template', 'skill', 'mystic'])).toEqual(`/assets/images/card-template/skill/mystic.webp`);

    expect(imageUrl(['card-template', 'event', 'neutral'])).toEqual(`/assets/images/card-template/event/neutral.webp`);

    expect(imageUrl(['card-template', 'investigator-details', 'rogue'])).toEqual(`/assets/images/card-template/investigator-details/rogue.webp`);
  });

  it('should generate card overlays url', () => {
    expect(imageUrl(['card-overlay', 'slot', 'ally'])).toEqual(`/assets/images/card-overlay/slot/ally.webp`);

    expect(imageUrl(['card-overlay', 'skill', 'icon', 'agility'])).toEqual(`/assets/images/card-overlay/skill/icon/agility.webp`);

    expect(imageUrl(['card-overlay', 'skill', 'box', 'seeker'])).toEqual(`/assets/images/card-overlay/skill/box/seeker.webp`);
  });

  it('should generate single-token card overlays url', () => {
    expect(imageUrl(['card-overlay', 'clue'])).toEqual(`/assets/images/card-overlay/clue.webp`);

    expect(imageUrl(['card-overlay', 'resource'])).toEqual(`/assets/images/card-overlay/resource.webp`);

    expect(imageUrl(['card-overlay', 'doom'])).toEqual(`/assets/images/card-overlay/doom.webp`);

    expect(imageUrl(['card-overlay', 'health'])).toEqual(`/assets/images/card-overlay/health.webp`);

    expect(imageUrl(['card-overlay', 'sanity'])).toEqual(`/assets/images/card-overlay/sanity.webp`);
  });

  it('should generate title card overlays url', () => {
    expect(imageUrl(['card-overlay', 'title', 'survivor'])).toEqual(`/assets/images/card-overlay/title/survivor.webp`);

    expect(imageUrl(['card-overlay', 'subtitle', 'guardian'])).toEqual(`/assets/images/card-overlay/subtitle/guardian.webp`);
  });

  it('should generate set icons', () => {
    expect(imageUrl(['set-icon', 'test'])).toEqual(`/assets/images/set-icon/test.webp`);
  });

  it('should generate card illustrations', () => {
    expect(imageUrl(['illustration', 'test', '015'])).toEqual(`/assets/images/illustration/test/015.webp`);

    expect(imageUrl(['mini-illustration', 'test', '015'])).toEqual(`/assets/images/mini-illustration/test/015.webp`);

    expect(imageUrl(['investigator', 'test', '015'])).toEqual(`/assets/images/investigator/test/015.webp`);
  });

  it('should take simple string', () => {
    expect(imageUrl('test/image')).toEqual(`/assets/images/test/image.webp`);
  });
});
