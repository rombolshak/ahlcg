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

export const getTotalPages = (
  activeAssetsCount: number,
  passiveAssetsCount: number,
  availableHeight: number,
) => {
  const totalNeededRows = Math.ceil(
    (activeAssetsCount + Math.ceil(passiveAssetsCount / 4)) / 3,
  );
  return Math.ceil(totalNeededRows / getAvailableRows(availableHeight));
};

export const sliceActiveAssets = (
  currentPage: number,
  availableHeight: number,
) => {
  const pageSize = getPageSize(availableHeight);
  return {
    start: currentPage * pageSize,
    end: currentPage * pageSize + pageSize,
  };
};

export const slicePassiveAssets = (
  activeAssetsCount: number,
  currentPage: number,
  availableHeight: number,
) => {
  const pageSize = getPageSize(availableHeight);
  const firstPageIndex = Math.floor(activeAssetsCount / pageSize);
  if (currentPage < firstPageIndex) return { start: 0, end: 0 };

  const firstPageSize = (pageSize - (activeAssetsCount % pageSize)) * 4;
  if (currentPage === firstPageIndex) return { start: 0, end: firstPageSize };
  const start =
    firstPageSize + (currentPage - firstPageIndex - 1) * pageSize * 4;
  return { start, end: start + pageSize * 4 };
};

const getPageSize = (availableHeight: number) =>
  getAvailableRows(availableHeight) * 3;
const getAvailableRows = (availableHeight: number) => {
  const pagerHeight = 42;
  const rowHeight = 5.5 * 16;
  const gap = 3 * 4;
  return Math.max(
    Math.floor((availableHeight - pagerHeight + gap) / (rowHeight + gap)),
    1,
  );
};
