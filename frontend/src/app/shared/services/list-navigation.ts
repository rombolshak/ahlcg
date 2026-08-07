import { computed, linkedSignal, Signal, WritableSignal } from '@angular/core';
import { InputLayer } from '@services/input-manager.service';

export type ListOrientation = 'vertical' | 'horizontal';

export interface ListNavigationConfig<T> {
  items: Signal<readonly T[]>;
  onConfirm?: (item: T) => void;
  orientation?: ListOrientation;
}

export interface ListNavigation<T> {
  readonly selectedIndex: WritableSignal<number>;
  readonly selectedItem: Signal<T | undefined>;
  readonly moveNext: () => void;
  readonly movePrevious: () => void;
  readonly handlers: InputLayer;
}

const isDisabled = (item: unknown): boolean => typeof item === 'object' && item !== null && 'disabled' in item && item.disabled === true;

const firstEnabledIndex = (items: readonly unknown[]): number => items.findIndex(item => !isDisabled(item));
const lastEnabledIndex = (items: readonly unknown[]): number => items.findLastIndex(item => !isDisabled(item));

const move = (items: readonly unknown[], from: number, direction: 1 | -1): number => {
  const count = items.length;
  if (count === 0) return -1;
  if (from < 0 || from >= count) {
    return direction === 1 ? firstEnabledIndex(items) : lastEnabledIndex(items);
  }

  for (let offset = 1; offset < count; offset++) {
    const candidate = (((from + direction * offset) % count) + count) % count;
    if (!isDisabled(items[candidate])) return candidate;
  }
  return from;
};

export function listNavigation<T>(config: ListNavigationConfig<T>): ListNavigation<T> {
  const { items, onConfirm, orientation = 'vertical' } = config;

  const selectedIndex = linkedSignal(() => firstEnabledIndex(items()));
  const selectedItem = computed(() => items()[selectedIndex()]);

  const moveNext = () => {
    selectedIndex.set(move(items(), selectedIndex(), 1));
  };
  const movePrevious = () => {
    selectedIndex.set(move(items(), selectedIndex(), -1));
  };

  const axisHandlers: InputLayer =
    orientation === 'horizontal' ? { moveLeft: movePrevious, moveRight: moveNext } : { moveUp: movePrevious, moveDown: moveNext };

  const confirmCallback = onConfirm;
  const handlers: InputLayer = confirmCallback
    ? {
        ...axisHandlers,
        confirm: () => {
          // a caller can land the index on a disabled entry — moving skips them, but
          // selectedIndex is writable and pointer input drives it directly
          const item = selectedItem();
          if (item !== undefined && !isDisabled(item)) confirmCallback(item);
        },
      }
    : axisHandlers;

  return {
    selectedIndex,
    selectedItem,
    moveNext,
    movePrevious,
    handlers,
  };
}
