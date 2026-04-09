import { ComponentFixture, TestBed } from '@angular/core/testing';

import { By } from '@angular/platform-browser';
import { getTranslocoModule } from '@domain/test/transloco.testing';
import { MenuItemsListComponent } from './menu-items-list.component';

describe('MenuItemsListComponent', () => {
  let pressAndCheck: (key: string, expectedItem: string) => void;
  let component: MenuItemsListComponent;
  let fixture: ComponentFixture<MenuItemsListComponent>;
  let calls1 = 0;
  let calls2 = 0;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuItemsListComponent, getTranslocoModule()],
    }).compileComponents();

    calls1 = 0;
    calls2 = 0;
    fixture = TestBed.createComponent(MenuItemsListComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', [
      {
        name: 'item1',
        tooltip: 'tooltip1',
        process: () => {
          calls1++;
        },
      },
      {
        name: 'item2',
        process: () => {
          calls2++;
        },
      },
      {
        name: 'item3',
        disabled: true,
        process: () => {
          calls2++;
        },
      },
      {
        name: 'item4',
        process: () => {
          calls2++;
        },
      },
    ]);
    await fixture.whenStable();

    pressAndCheck = (key: string, expectedItem: string) => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: key }));
      TestBed.tick();

      expect(
        (
          fixture.debugElement.query(By.css('.active'))
            .nativeElement as HTMLElement
        ).textContent,
      ).toContain(expectedItem);
    };
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render items list', () => {
    expect(fixture.debugElement.queryAll(By.css('[type=button]')).length).toBe(
      3,
    );
  });

  it('should set active element on load', () => {
    const el = fixture.debugElement.query(By.css('[type=button]'));

    expect(el.classes['active']).toBeTrue();
    expect(fixture.debugElement.queryAll(By.css('.active')).length).toBe(1);
  });

  it('should display tooltip', () => {
    expect(fixture.debugElement.queryAll(By.css('.tooltip-open')).length).toBe(
      1,
    );
  });

  it('should react to keyboard events', () => {
    expect(
      (
        fixture.debugElement.query(By.css('.active'))
          .nativeElement as HTMLElement
      ).textContent,
    ).toContain('item1');

    pressAndCheck('ArrowDown', 'item2');
    pressAndCheck('ArrowDown', 'item4');
    pressAndCheck('ArrowUp', 'item2');
    pressAndCheck('ArrowUp', 'item1');

    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Enter' }),
    );

    expect(calls1).toBe(1);
    expect(calls2).toBe(0);
  });
});
