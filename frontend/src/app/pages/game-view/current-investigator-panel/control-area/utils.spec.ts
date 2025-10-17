import { assetId } from '@domain/entities/id.model';
import { AssetCard, AssetSlot } from '@domain/entities/player-card.model';
import { defaultSlots } from '@domain/test/entities/test-investigators';
import {
  emptySlots,
  getTotalPages,
  isActive,
  sliceActiveAssets,
  slicePassiveAssets,
} from './utils';

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

describe('control-area / utils / getTotalPages', () => {
  it('should calc for active assets', () => {
    expect(getTotalPages(20, 0, 750)).toEqual(1);
    expect(getTotalPages(20, 0, 440)).toEqual(2);
    expect(getTotalPages(20, 0, 396)).toEqual(3);
    expect(getTotalPages(20, 0, 240)).toEqual(4);
    expect(getTotalPages(20, 0, 131)).toEqual(7);
  });

  it('should calc for passive assets', () => {
    expect(getTotalPages(0, 80, 750)).toEqual(1);
    expect(getTotalPages(0, 80, 440)).toEqual(2);
    expect(getTotalPages(0, 80, 396)).toEqual(3);
    expect(getTotalPages(0, 80, 240)).toEqual(4);
    expect(getTotalPages(0, 80, 131)).toEqual(7);
  });

  it('should calc for combined assets', () => {
    expect(getTotalPages(10, 40, 750)).toEqual(1);
    expect(getTotalPages(1, 19 * 4, 440)).toEqual(2);
    expect(getTotalPages(19, 1, 396)).toEqual(3);
    expect(getTotalPages(5, 15 * 4, 240)).toEqual(4);
    expect(getTotalPages(15, 5 * 3, 131)).toEqual(7);
  });
});

describe('control-area / utils / sliceActiveAssets', () => {
  it('should slice active assets', () => {
    expect(sliceActiveAssets(2, 750)).toEqual({ start: 21 * 2, end: 21 * 3 });
    expect(sliceActiveAssets(2, 440)).toEqual({ start: 12 * 2, end: 12 * 3 });
    expect(sliceActiveAssets(2, 396)).toEqual({ start: 9 * 2, end: 9 * 3 });
    expect(sliceActiveAssets(2, 240)).toEqual({ start: 6 * 2, end: 6 * 3 });
    expect(sliceActiveAssets(2, 131)).toEqual({ start: 3 * 2, end: 3 * 3 });
  });
});

describe('control-area / utils / slicePassiveAssets', () => {
  it('should slice passive assets', () => {
    // влезает 7 строк, 10 больших ассетов занимают первые 3 строки + 1 слот на 4 строке
    // итого на первой странице остается 44 мест под маленькие ассеты
    // и со второй страницы целиком идут маленькие с индекса 45
    expect(slicePassiveAssets(10, 2, 750)).toEqual({
      start: 44 + 21 * 4 * 1,
      end: 44 + 21 * 4 * 2,
    });

    expect(slicePassiveAssets(10, 2, 440)).toEqual({
      start: 8 + 12 * 4 * 1,
      end: 8 + 12 * 4 * 2,
    });

    expect(slicePassiveAssets(10, 2, 396)).toEqual({
      start: 32 + 9 * 4 * 0,
      end: 32 + 9 * 4 * 1,
    });

    expect(slicePassiveAssets(10, 2, 240)).toEqual({
      start: 8 + 6 * 4 * 0,
      end: 8 + 6 * 4 * 1,
    });

    expect(slicePassiveAssets(10, 2, 131)).toEqual({
      start: 0,
      end: 0,
    });
  });
});
