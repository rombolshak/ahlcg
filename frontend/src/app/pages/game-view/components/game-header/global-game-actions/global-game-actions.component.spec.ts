import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalGameActionsComponent } from './global-game-actions.component';

describe('GlobalGameActionsComponent', () => {
  let component: GlobalGameActionsComponent;
  let fixture: ComponentFixture<GlobalGameActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalGameActionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalGameActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
