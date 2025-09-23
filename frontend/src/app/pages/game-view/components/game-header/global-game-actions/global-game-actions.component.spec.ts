import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideZonelessChangeDetection } from '@angular/core';
import { By } from '@angular/platform-browser';
import { getTranslocoModule } from 'shared/domain/test/transloco.testing';
import { GlobalGameActionsComponent } from './global-game-actions.component';

describe('GlobalGameActionsComponent', () => {
  let component: GlobalGameActionsComponent;
  let fixture: ComponentFixture<GlobalGameActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [GlobalGameActionsComponent, getTranslocoModule()],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalGameActionsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('actions', []);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display all visible buttons', () => {
    let handler1 = false;
    let handler2 = false;
    let handler3 = false;
    fixture.componentRef.setInput('actions', [
      {
        icon: 'test',
        tooltip: 'test',
        isVisible: true,
        handler: () => {
          console.log('clicked test');
          handler1 = true;
        },
      },
      {
        icon: 'test2',
        tooltip: 'test2',
        isVisible: false,
        handler: () => {
          console.log('clicked test2');
          handler2 = true;
        },
      },
      {
        icon: 'test3',
        tooltip: 'test3',
        isVisible: true,
        handler: () => {
          console.log('clicked test3');
          handler3 = true;
        },
      },
    ]);

    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));

    expect(buttons.length).toBe(2);

    (buttons[1]?.nativeElement as HTMLButtonElement).click();

    expect(handler1).toBe(false);
    expect(handler2).toBe(false);
    expect(handler3).toBe(true);
  });
});
