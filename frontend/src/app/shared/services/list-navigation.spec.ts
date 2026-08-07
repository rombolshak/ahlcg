import { signal } from '@angular/core';
import { listNavigation } from './list-navigation';

interface Item {
  name: string;
  disabled?: boolean;
}

const item = (name: string, disabled?: boolean): Item => (disabled === undefined ? { name } : { name, disabled });

describe('list-navigation / seed', () => {
  it('should select the first entry', () => {
    const items = signal([item('a'), item('b'), item('c')]);

    const navigation = listNavigation({ items });

    expect(navigation.selectedIndex()).toBe(0);
    expect(navigation.selectedItem()).toEqual(item('a'));
  });

  it('should skip disabled entries when seeding', () => {
    const items = signal([item('a', true), item('b'), item('c')]);

    const navigation = listNavigation({ items });

    expect(navigation.selectedIndex()).toBe(1);
  });

  it('should return -1 for an empty list', () => {
    const items = signal<Item[]>([]);

    const navigation = listNavigation({ items });

    expect(navigation.selectedIndex()).toBe(-1);
    expect(navigation.selectedItem()).toBeUndefined();
  });

  it('should re-seed selection when the items signal changes', () => {
    const items = signal([item('a'), item('b'), item('c')]);
    const navigation = listNavigation({ items });

    navigation.moveNext();
    navigation.moveNext();

    expect(navigation.selectedIndex()).toBe(2);

    // the replacement list's first enabled entry is 0, so an index that failed to
    // re-seed would still read 2 here rather than coincidentally matching
    items.set([item('x'), item('y')]);

    expect(navigation.selectedIndex()).toBe(0);
    expect(navigation.selectedItem()).toEqual(item('x'));
  });
});

describe('list-navigation / wrap-around', () => {
  it('should wrap forward and backward over a plain list', () => {
    const items = signal([item('a'), item('b'), item('c')]);
    const navigation = listNavigation({ items });

    navigation.moveNext();

    expect(navigation.selectedIndex()).toBe(1);
    navigation.moveNext();

    expect(navigation.selectedIndex()).toBe(2);
    navigation.moveNext();

    expect(navigation.selectedIndex()).toBe(0);

    navigation.movePrevious();

    expect(navigation.selectedIndex()).toBe(2);
    navigation.movePrevious();

    expect(navigation.selectedIndex()).toBe(1);
    navigation.movePrevious();

    expect(navigation.selectedIndex()).toBe(0);
  });
});

describe('list-navigation / disabled skipping', () => {
  // mirrors MenuItemsListComponent's spec: 4 items, item3 (index 2) disabled
  it('should skip the disabled entry in both directions, matching the menu sequence', () => {
    const items = signal([item('item1'), item('item2'), item('item3', true), item('item4')]);
    const navigation = listNavigation({ items });

    expect(navigation.selectedIndex()).toBe(0);
    navigation.moveNext();

    expect(navigation.selectedIndex()).toBe(1);
    navigation.moveNext();

    expect(navigation.selectedIndex()).toBe(3);
    navigation.moveNext();

    expect(navigation.selectedIndex()).toBe(0);

    navigation.movePrevious();

    expect(navigation.selectedIndex()).toBe(3);
    navigation.movePrevious();

    expect(navigation.selectedIndex()).toBe(1);
    navigation.movePrevious();

    expect(navigation.selectedIndex()).toBe(0);
  });

  it('should treat items with no disabled property as always selectable', () => {
    const items = signal([{ name: 'a' }, { name: 'b' }]);
    const navigation = listNavigation({ items });

    expect(navigation.selectedIndex()).toBe(0);
    navigation.moveNext();

    expect(navigation.selectedIndex()).toBe(1);
  });

  it('should hold the index when every entry is disabled', () => {
    const items = signal([item('a', true), item('b', true)]);
    const navigation = listNavigation({ items });

    expect(navigation.selectedIndex()).toBe(-1);

    // reachable from the menu, whose tooltip wrapper sets the index on (mouseenter)
    // even for a disabled entry
    navigation.selectedIndex.set(1);
    navigation.moveNext();

    expect(navigation.selectedIndex()).toBe(1);
    navigation.movePrevious();

    expect(navigation.selectedIndex()).toBe(1);
  });
});

describe('list-navigation / handlers', () => {
  it('should bind moveUp/moveDown and no horizontal commands for the vertical orientation (default)', () => {
    const items = signal([item('a'), item('b')]);
    const navigation = listNavigation({ items });

    expect(navigation.handlers.moveUp).toBeDefined();
    expect(navigation.handlers.moveDown).toBeDefined();
    expect(navigation.handlers.moveLeft).toBeUndefined();
    expect(navigation.handlers.moveRight).toBeUndefined();
  });

  it('should bind moveLeft/moveRight and no vertical commands for the horizontal orientation', () => {
    const items = signal([item('a'), item('b')]);
    const navigation = listNavigation({ items, orientation: 'horizontal' });

    expect(navigation.handlers.moveLeft).toBeDefined();
    expect(navigation.handlers.moveRight).toBeDefined();
    expect(navigation.handlers.moveUp).toBeUndefined();
    expect(navigation.handlers.moveDown).toBeUndefined();
  });

  it('should not carry a confirm handler without onConfirm', () => {
    const items = signal([item('a')]);
    const navigation = listNavigation({ items });

    expect(navigation.handlers.confirm).toBeUndefined();
  });

  it('should call onConfirm with the selected item', async () => {
    const items = signal([item('a'), item('b')]);
    let confirmed: Item | undefined;
    const navigation = listNavigation({
      items,
      onConfirm: selected => {
        confirmed = selected;
      },
    });

    navigation.moveNext();
    await navigation.handlers.confirm?.();

    expect(confirmed).toEqual(item('b'));
  });
});
