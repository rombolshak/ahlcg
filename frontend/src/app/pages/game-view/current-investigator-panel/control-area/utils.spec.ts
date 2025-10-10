import { assetId } from '../../../../shared/domain/entities/id.model';
import {
  AssetCard,
  AssetSlot,
} from '../../../../shared/domain/entities/player-card.model';
import { defaultSlots } from '../../../../shared/domain/test/entities/test-investigators';
import { emptySlots, isActive } from './utils';

const emptyAsset: AssetCard = {
  id: assetId.assert('1'),
  faction: 'neutral',
  cardType: 'asset',
  skills: {
    agility: 0,
    combat: 0,
    intellect: 0,
    wild: 0,
    willpower: 0,
  },
  cost: 0,
  hasAction: false,
  setInfo: {
    set: '01',
    index: '001',
  },
};

describe('control-area / utils / isActive', () => {
  it('should return false for empty asset', () => {
    expect(isActive({ ...emptyAsset })).toBe(false);
  });

  it('should return true for asset with slot', () => {
    expect(isActive({ ...emptyAsset, slot: 'accessory' })).toBe(true);
  });

  it('should return true for asset with action', () => {
    expect(isActive({ ...emptyAsset, hasAction: true })).toBe(true);
  });

  it('should return true for asset with health', () => {
    expect(isActive({ ...emptyAsset, health: { max: 1, damaged: 0 } })).toBe(
      true,
    );
  });

  it('should return true for asset with sanity', () => {
    expect(isActive({ ...emptyAsset, sanity: { max: 1, damaged: 0 } })).toBe(
      true,
    );
  });

  it('should return true for asset with resources', () => {
    expect(isActive({ ...emptyAsset, tokens: { resource: 1 } })).toBe(true);
  });

  it('should return true for asset with clues', () => {
    expect(isActive({ ...emptyAsset, tokens: { clue: 1 } })).toBe(true);
  });

  it('should return true for asset with doom', () => {
    expect(isActive({ ...emptyAsset, tokens: { doom: 1 } })).toBe(true);
  });
});

describe('control-area / utils / emptySlots', () => {
  const takeSlot: (slot: AssetSlot) => AssetCard = (slot) => ({
    ...emptyAsset,
    slot: slot,
  });

  it('should return none if all slots taken', () => {
    const result = emptySlots(
      [
        takeSlot('two-hands'),
        takeSlot('two-arcane'),
        takeSlot('body'),
        takeSlot('ally'),
        takeSlot('accessory'),
      ],
      defaultSlots,
    );

    expect(result).toEqual({
      ally: 0,
      accessory: 0,
      arcane: 0,
      body: 0,
      hand: 0,
      tarot: 0,
    });
  });

  it('should return all if assets take none', () => {
    const result = emptySlots([emptyAsset], defaultSlots);

    expect(result).toEqual(defaultSlots);
  });

  it('should return excess slots', () => {
    const result = emptySlots(
      [
        takeSlot('two-hands'),
        takeSlot('two-arcane'),
        takeSlot('body'),
        takeSlot('ally'),
        takeSlot('accessory'),
      ],
      { ...defaultSlots, hand: 3 },
    );

    expect(result).toEqual({
      ally: 0,
      accessory: 0,
      arcane: 0,
      body: 0,
      hand: 1,
      tarot: 0,
    });
  });
});
