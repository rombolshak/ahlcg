import {
  AssetCard,
  AssetSlot,
  SlotsCount,
} from 'shared/domain/entities/player-card.model';

export const isActive: (asset: AssetCard) => boolean = (asset) => {
  if (asset.slot) return true;
  if (asset.hasAction) return true;
  if (asset.health || asset.sanity) return true;
  return !!asset.tokens;
};

export const emptySlots: (
  assets: AssetCard[],
  slotsCount: SlotsCount,
) => SlotsCount = (assets, counts) => {
  const convertSlot: (s: AssetSlot | undefined) => AssetSlot[] = (s) => {
    switch (s) {
      case 'two-hands':
        return ['hand', 'hand'];
      case 'two-arcane':
        return ['arcane', 'arcane'];
      case undefined:
        return [];
      default:
        return [s];
    }
  };
  const takenSlots = assets.flatMap((a) => [
    ...convertSlot(a.slot),
    ...convertSlot(a.additionalSlot),
  ]);

  return Object.fromEntries(
    Object.entries(counts).map(([slot, slotMax]) => {
      const currentlyTaken = takenSlots.filter((s) => s == slot).length;
      const empty = Math.max(slotMax - currentlyTaken, 0);
      return [slot, empty];
    }),
  ) as SlotsCount;
};
